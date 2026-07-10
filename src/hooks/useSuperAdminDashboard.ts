import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, getDoc, deleteDoc, writeBatch, setDoc } from '@react-native-firebase/firestore';
import { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';
import { UserProfile, Organization } from '../types';
import { Alert } from 'react-native';

export const useSuperAdminDashboard = () => {
    const [pendingCompanies, setPendingCompanies] = useState<(UserProfile & { orgName?: string })[]>([]);
    const [allCompanies, setAllCompanies] = useState<(UserProfile & { orgName?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        const db = getFirestore();
        
        let companyAdminsList: UserProfile[] = [];
        let requestersList: UserProfile[] = [];
        const orgMap: { [id: string]: Organization } = {};

        const updateState = () => {
            // Merge both lists ensuring unique UIDs
            const mergedMap: { [uid: string]: UserProfile } = {};
            companyAdminsList.forEach(u => mergedMap[u.uid] = u);
            requestersList.forEach(u => mergedMap[u.uid] = u);
            const combinedList = Object.values(mergedMap);

            const companies = combinedList.map(userData => {
                const orgId = userData.organizationId;
                const organizationObj = orgId ? orgMap[orgId] : null;
                const orgName = organizationObj 
                    ? organizationObj.name 
                    : (userData.companyRequestName || 'Unknown Organization');
                return {
                    ...userData,
                    orgName,
                    organization: organizationObj || undefined
                };
            });
            
            setPendingCompanies(companies.filter((c: any) => c.status === 'pending' || c.companyRequestStatus === 'pending'));
            setAllCompanies(companies);
            setLoading(false);
        };

        // Listen to organizations
        const unsubscribeOrgs = onSnapshot(collection(db, 'organizations'), (orgsSnapshot) => {
            orgsSnapshot.forEach((docSnapshot: any) => {
                orgMap[docSnapshot.id] = { id: docSnapshot.id, ...docSnapshot.data() } as Organization;
            });
            updateState();
        }, (error) => {
            console.error("Error listening to organizations:", error);
        });

        // Query for legacy company admins
        const qCompanyAdmins = query(
            collection(db, 'users'),
            where('role', '==', 'company_admin')
        );

        const unsubscribeCompanyAdmins = onSnapshot(qCompanyAdmins, (snapshot) => {
            const list: UserProfile[] = [];
            snapshot.forEach((docSnapshot: any) => {
                list.push({ uid: docSnapshot.id, ...docSnapshot.data() } as UserProfile);
            });
            companyAdminsList = list;
            updateState();
        }, (error) => {
            console.error("Error listening to company admins:", error);
            setLoading(false);
        });

        // Query for new company creation requests
        const qRequesters = query(
            collection(db, 'users'),
            where('companyRequestStatus', '==', 'pending')
        );

        const unsubscribeRequesters = onSnapshot(qRequesters, (snapshot) => {
            const list: UserProfile[] = [];
            snapshot.forEach((docSnapshot: any) => {
                list.push({ uid: docSnapshot.id, ...docSnapshot.data() } as UserProfile);
            });
            requestersList = list;
            updateState();
        }, (error) => {
            console.error("Error listening to company requesters:", error);
        });

        return () => {
            unsubscribeOrgs();
            unsubscribeCompanyAdmins();
            unsubscribeRequesters();
        };
    }, []);

    const approveCompany = async (userId: string, orgId: string) => {
        try {
            setProcessingId(userId);
            const db = getFirestore();
            
            // Find user in local state to see if it is a new company request
            const companyUser = pendingCompanies.find(c => c.uid === userId);
            
            if (companyUser && companyUser.companyRequestStatus === 'pending') {
                const companyName = companyUser.companyRequestName || 'My Company';
                const companyEmail = companyUser.companyRequestEmail || companyUser.email;
                const companyPhone = companyUser.companyRequestPhone || '';
                const companyAddress = companyUser.companyRequestAddress || '';
                
                // 1. Generate unique organization ID & 6-digit code
                const newOrgId = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const newOrgCode = Math.random().toString(36).substr(2, 6).toUpperCase();
                
                // 2. Create the Organization document
                const newOrganization = {
                    id: newOrgId,
                    name: companyName,
                    code: newOrgCode,
                    email: companyEmail,
                    phone: companyPhone,
                    address: companyAddress,
                    subscriptionPlan: 'free',
                    subscriptionStatus: 'trial',
                    subscriptionStartDate: Date.now(),
                    maxUsers: 10,
                    maxLocations: 2,
                    createdAt: Date.now(),
                    createdBy: userId,
                    isActive: true,
                };
                
                await setDoc(doc(db, 'organizations', newOrgId), newOrganization);
                
                // 3. Update the User profile
                await updateDoc(doc(db, 'users', userId), {
                    role: 'company_admin',
                    organizationId: newOrgId,
                    status: 'approved',
                    companyRequestStatus: 'approved',
                    isActive: true
                });
            } else {
                // Legacy Company Admin signup approval
                await updateDoc(doc(db, 'users', userId), {
                    status: 'approved',
                    isActive: true
                });
            }
            
            Alert.alert('Success', 'Company approved successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const rejectCompany = async (userId: string, rejectReason?: string) => {
        try {
            setProcessingId(userId);
            const db = getFirestore();
            
            const companyUser = pendingCompanies.find(c => c.uid === userId);
            
            if (companyUser && companyUser.companyRequestStatus === 'pending') {
                // Reject new company request (keep them as employee/free agent, just set request status to rejected)
                await updateDoc(doc(db, 'users', userId), {
                    companyRequestStatus: 'rejected',
                    companyRequestError: rejectReason || 'Your request did not meet the criteria. Please verify your details.'
                });
            } else {
                // Legacy company admin signup reject
                await updateDoc(doc(db, 'users', userId), {
                    status: 'rejected',
                    isActive: false
                });
            }
            Alert.alert('Success', 'Company request rejected');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const deleteCompanyAdmin = async (userId: string) => {
        try {
            setProcessingId(userId);
            const db = getFirestore();
            await deleteDoc(doc(db, 'users', userId));
            Alert.alert('Success', 'Company Admin deleted permanently');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const toggleCompanyStatus = async (userId: string, currentStatus: boolean) => {
        try {
            setProcessingId(userId);
            const db = getFirestore();
            await updateDoc(doc(db, 'users', userId), {
                isActive: !currentStatus
            });
            Alert.alert('Success', `Company Admin ${!currentStatus ? 'activated' : 'deactivated'}`);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const updateCompanyAdminName = async (userId: string, newName: string) => {
        try {
            setProcessingId(userId);
            const db = getFirestore();
            await updateDoc(doc(db, 'users', userId), {
                name: newName
            });
            Alert.alert('Success', 'Name updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const updateCompanyAdminPassword = async (email: string) => {
        try {
             const auth = getAuth();
             await sendPasswordResetEmail(auth, email);
             Alert.alert('Success', `Password reset email sent to ${email}`);
        } catch (error: any) {
            Alert.alert('Error', 'Cannot directly change password. Sent reset email instead.\n' + error.message);
        }
    };

    const approveAllPending = async () => {
        const legacyPending = pendingCompanies.filter(c => c.companyRequestStatus !== 'pending');
        
        if (legacyPending.length === 0) {
            Alert.alert('Info', 'No pending legacy companies to approve. Please approve new company requests individually.');
            return;
        }

        Alert.alert(
            'Approve All',
            `Are you sure you want to approve all ${legacyPending.length} pending legacy companies?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve All',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const db = getFirestore();
                            const batch = writeBatch(db);
                            legacyPending.forEach(c => {
                                const ref = doc(db, 'users', c.uid);
                                batch.update(ref, {
                                    status: 'approved',
                                    isActive: true
                                });
                            });
                            await batch.commit();
                            Alert.alert('Success', `Approved all ${legacyPending.length} companies successfully`);
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    return {
        pendingCompanies,
        allCompanies,
        loading,
        processingId,
        approveCompany,
        rejectCompany,
        deleteCompanyAdmin,
        toggleCompanyStatus,
        updateCompanyAdminName,
        updateCompanyAdminPassword,
        approveAllPending
    };
};
