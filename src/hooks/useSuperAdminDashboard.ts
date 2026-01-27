import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, getDoc, deleteDoc } from '@react-native-firebase/firestore';
import { getAuth, sendPasswordResetEmail } from '@react-native-firebase/auth';
import { UserProfile, Organization } from '../types';
import { Alert } from 'react-native';

export const useSuperAdminDashboard = () => {
    const [pendingCompanies, setPendingCompanies] = useState<(UserProfile & { orgName?: string })[]>([]);
    const [allCompanies, setAllCompanies] = useState<(UserProfile & { orgName?: string })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const db = getFirestore();
        
        // Query for all company admins
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'company_admin')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const companies: (UserProfile & { orgName?: string })[] = [];
            
            for (const docSnapshot of snapshot.docs) {
                const userData = docSnapshot.data() as UserProfile;
                
                // Fetch organization name
                let orgName = 'Unknown Organization';
                if (userData.organizationId) {
                    const orgDoc = await getDoc(doc(db, 'organizations', userData.organizationId));
                    if (orgDoc.exists()) {
                        orgName = (orgDoc.data() as Organization).name;
                    }
                }

                companies.push({
                    ...userData,
                    orgName
                });
            }

            // Filter for pending and all
            setPendingCompanies(companies.filter(c => c.status === 'pending'));
            setAllCompanies(companies);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const approveCompany = async (userId: string, orgId: string) => {
        try {
            const db = getFirestore();
            await updateDoc(doc(db, 'users', userId), {
                status: 'approved',
                isActive: true
            });
            Alert.alert('Success', 'Company approved successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const rejectCompany = async (userId: string) => {
        try {
            const db = getFirestore();
            await updateDoc(doc(db, 'users', userId), {
                status: 'rejected',
                isActive: false
            });
            Alert.alert('Success', 'Company rejected');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const deleteCompanyAdmin = async (userId: string) => {
        try {
            const db = getFirestore();
            await deleteDoc(doc(db, 'users', userId));
            Alert.alert('Success', 'Company Admin deleted permanently');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const toggleCompanyStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const db = getFirestore();
            await updateDoc(doc(db, 'users', userId), {
                isActive: !currentStatus
            });
            Alert.alert('Success', `Company Admin ${!currentStatus ? 'activated' : 'deactivated'}`);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const updateCompanyAdminName = async (userId: string, newName: string) => {
        try {
            const db = getFirestore();
            await updateDoc(doc(db, 'users', userId), {
                name: newName
            });
            Alert.alert('Success', 'Name updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message);
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

    return {
        pendingCompanies,
        allCompanies,
        loading,
        approveCompany,
        rejectCompany,
        deleteCompanyAdmin,
        toggleCompanyStatus,
        updateCompanyAdminName,
        updateCompanyAdminPassword
    };
};
