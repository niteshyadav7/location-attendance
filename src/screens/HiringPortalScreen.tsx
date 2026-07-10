import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../constants/theme';
import firestore from '@react-native-firebase/firestore';
import { format } from 'date-fns';

export const HiringPortalScreen = ({ navigation }: any) => {
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const setOrganization = useAuthStore((state) => state.setOrganization);

  // Tab State
  const [activeTab, setActiveTab] = useState<'find' | 'pipeline' | 'stages'>('find');

  // Core Stage settings
  const [stages, setStages] = useState<string[]>(['Invited', 'Shortlisted', 'Interview', 'Trial Shift', 'Hired', 'Rejected']);
  const [loadingStages, setLoadingStages] = useState(true);
  const [savingStages, setSavingStages] = useState(false);
  const [renameMap, setRenameMap] = useState<{ [key: string]: string }>({});
  const [deletedStages, setDeletedStages] = useState<string[]>([]);

  // Search & Filter State (Find Workers Tab)
  const [searchLocality, setSearchLocality] = useState('Kaasganj');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // In-App Invitation Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Immediate Vacancy State
  const [vacancyModalVisible, setVacancyModalVisible] = useState(false);
  const [vacancyCategory, setVacancyCategory] = useState('Kirana Helper');
  const [vacancyDescription, setVacancyDescription] = useState('');
  const [sendingVacancy, setSendingVacancy] = useState(false);

  // Broadcasts CRUD State
  const [myBroadcasts, setMyBroadcasts] = useState<any[]>([]);
  const [manageBroadcastsModalVisible, setManageBroadcastsModalVisible] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<any | null>(null);
  const [vacancyPhone, setVacancyPhone] = useState('');
  const [vacancyName, setVacancyName] = useState('');
  const [vacancyPayout, setVacancyPayout] = useState('');
  const [vacancyLocality, setVacancyLocality] = useState('');
  const [vacancyTargetAudience, setVacancyTargetAudience] = useState<'all' | 'notice' | 'immediate'>('all');



  // Pipeline Tab States
  const [pipelineInquiries, setPipelineInquiries] = useState<any[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [selectedPipelineStage, setSelectedPipelineStage] = useState<string>('Invited');

  // Candidate Management Modal States
  const [pipelineModalVisible, setPipelineModalVisible] = useState(false);
  const [selectedPipelineInquiry, setSelectedPipelineInquiry] = useState<any | null>(null);
  const [tempStage, setTempStage] = useState<string>('');
  const [inquiryNotes, setInquiryNotes] = useState<string>('');
  const [savingPipelineStatus, setSavingPipelineStatus] = useState(false);

  // Add new stage configuration state
  const [newStageName, setNewStageName] = useState('');

  const categories = [
    'All',
    'Kirana Helper',
    'Billing Operator',
    'Accountant',
    'Store Manager',
    'Delivery & Driver',
    'Sales Associate',
  ];

  useEffect(() => {
    loadHiringStages();
  }, [organization?.id]);

  useEffect(() => {
    if (!organization?.id) return;
    const db = firestore();
    const unsubscribe = db.collection('immediate_vacancies')
      .where('employerId', '==', organization.id)
      .onSnapshot((snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setMyBroadcasts(list.sort((a, b) => b.timestamp - a.timestamp));
      }, (err) => {
        console.error('Error listening to my broadcasts:', err);
      });

    return () => unsubscribe();
  }, [organization?.id]);


  useEffect(() => {
    if (activeTab === 'find') {
      fetchCandidates();
    } else if (activeTab === 'pipeline') {
      fetchPipelineInquiries();
    }
  }, [activeTab, searchLocality, selectedCategory]);

  const loadHiringStages = async () => {
    if (!organization?.id) return;
    try {
      setLoadingStages(true);
      const orgDoc = await firestore().collection('organizations').doc(organization.id).get();
      if (orgDoc.exists()) {
        const data = orgDoc.data();
        if (data?.hiringStages && data.hiringStages.length > 0) {
          setStages(data.hiringStages);
          setSelectedPipelineStage(data.hiringStages[0]);
          setLoadingStages(false);
          return;
        }
      }
      // Set defaults
      const defaults = ['Invited', 'Shortlisted', 'Interview', 'Trial Shift', 'Hired', 'Rejected'];
      setStages(defaults);
      setSelectedPipelineStage(defaults[0]);
    } catch (err) {
      console.error('Error loading hiring stages:', err);
    } finally {
      setLoadingStages(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const db = firestore();
      
      let query = db.collection('hiring_profiles')
        .where('isLookingForJob', '==', true);

      if (searchLocality.trim().length > 0) {
        query = query.where('locality', '==', searchLocality.trim());
      }

      if (selectedCategory !== 'All') {
        query = query.where('jobTitle', '==', selectedCategory);
      }

      const snapshot = await query.get();
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.visibilityState === 'active' || data.visibilityState === 'notice') {
          list.push({ id: doc.id, ...data });
        }
      });
      
      setCandidates(list.sort((a, b) => b.attendanceTrustDays - a.attendanceTrustDays));
    } catch (error: any) {
      console.error('Error fetching job candidates:', error);
      Alert.alert('Error', 'Failed to load local workers directory.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelineInquiries = async () => {
    if (!organization?.id) return;
    try {
      setPipelineLoading(true);
      const db = firestore();
      const snapshot = await db.collection('job_inquiries')
        .where('employerId', '==', organization.id)
        .get();

      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });

      setPipelineInquiries(list.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      console.error('Error fetching inquiries:', err);
    } finally {
      setPipelineLoading(false);
    }
  };

  const handleCallCandidate = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Cannot launch dialer.');
    });
  };

  const handleWhatsAppCandidate = (candidate: any) => {
    let message = '';
    const phone = candidate.phone || candidate.workerPhone;

    // Check if candidate is a pipeline inquiry (has status or acceptedByWorker)
    const isPipeline = 'status' in candidate || 'acceptedByWorker' in candidate;

    if (isPipeline) {
      const isPendingAccept = !candidate.acceptedByWorker;
      if (isPendingAccept) {
        message = `Hello ${candidate.workerName}, I sent you an invitation on the GeoAttendance app for the ${candidate.workerJobTitle} position at our store. Please open the app and accept the invite so we can connect. Thank you!`;
      } else {
        const stage = candidate.status;
        if (stage === 'Interview') {
          message = `Hello ${candidate.workerName}, we have shortlisted you for the ${candidate.workerJobTitle} role! We'd love to schedule a brief interview with you. Let us know when you are available. Thanks, ${organization?.name || 'our store'}.`;
        } else if (stage === 'Trial Shift') {
          message = `Hello ${candidate.workerName}, we would like to invite you for a trial shift for the ${candidate.workerJobTitle} role at ${organization?.name || 'our store'}. Please let us know when you can start. Thanks!`;
        } else if (stage === 'Hired') {
          message = `Hello ${candidate.workerName}, welcome to ${organization?.name || 'our store'}! We are excited to have you join our team. Thanks!`;
        } else {
          message = `Hello ${candidate.workerName}, I'd like to follow up on your application for ${candidate.workerJobTitle} at ${organization?.name || 'our store'}. Let's connect here. Thanks!`;
        }
      }
    } else {
      // Find Workers discovery template
      message = `Hello ${candidate.name}, I saw your verified attendance trust score of ${candidate.attendanceTrustDays} active days on the GeoAttendance app. We have a vacancy for a ${candidate.jobTitle} at our store and would love to chat. Are you available?`;
    }

    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${phone}`);
    });
  };

  const openInviteModal = (candidate: any) => {
    setSelectedCandidate(candidate);
    setInviteMessage(
      `Hello! I viewed your profile on GeoAttendance and would love to offer you a position at our store, ${organization?.name || 'our company'}. Please accept this invite to connect and discuss details!`
    );
    setInviteModalVisible(true);
  };

  const handleSendInvite = async () => {
    if (!selectedCandidate || !organization) return;
    setSendingInvite(true);
    try {
      const db = firestore();
      const now = Date.now();
      const initialStage = stages[0] || 'Invited';

      // Check if already invited
      const existingQuery = await db.collection('job_inquiries')
        .where('employerId', '==', organization.id)
        .where('workerId', '==', selectedCandidate.uid)
        .get();

      // Check if there is an active (non-hired/non-rejected) inquiry
      let alreadyInvited = false;
      existingQuery.forEach(doc => {
        const status = doc.data().status;
        if (status !== 'Hired' && status !== 'Rejected') {
          alreadyInvited = true;
        }
      });

      if (alreadyInvited) {
        Alert.alert('Already Invited', 'You have an active recruitment pipeline with this candidate.');
        setInviteModalVisible(false);
        return;
      }

      await db.collection('job_inquiries').add({
        employerId: organization.id,
        employerName: organization.name,
        employerPhone: organization.phone || user?.phone || '',
        workerId: selectedCandidate.uid,
        workerName: selectedCandidate.name,
        workerJobTitle: selectedCandidate.jobTitle,
        workerPhone: selectedCandidate.phone || '',
        workerTrustDays: selectedCandidate.attendanceTrustDays || 0,
        message: inviteMessage.trim(),
        status: initialStage,
        timestamp: now,
        acceptedByWorker: false,
        notes: '',
      });

      // Send a push notification (using the in-app notifications model)
      await db.collection('notifications').add({
        type: 'MONEY_REQUEST',
        userId: selectedCandidate.uid,
        userName: selectedCandidate.name,
        organizationId: organization.id,
        message: `Job Invitation from ${organization.name}: ${inviteMessage.trim()}`,
        timestamp: now,
        read: false,
      });

      Alert.alert('Success', `In-App Invitation sent to ${selectedCandidate.name}!`);
      setInviteModalVisible(false);
      fetchPipelineInquiries();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send invitation: ' + error.message);
    } finally {
      setSendingInvite(false);
    }
  };

  const openCreateVacancyModal = () => {
    setEditingVacancy(null);
    setVacancyCategory(selectedCategory !== 'All' ? selectedCategory : 'Kirana Helper');
    setVacancyDescription('');
    setVacancyPayout('');
    setVacancyLocality(searchLocality.trim() || 'Kaasganj');
    setVacancyName(organization?.name || user?.name || '');
    setVacancyPhone(organization?.phone || user?.phone || '');
    setVacancyTargetAudience('all');
    setVacancyModalVisible(true);
  };

  const openEditVacancyModal = (vacancy: any) => {
    setEditingVacancy(vacancy);
    setVacancyCategory(vacancy.jobCategory);
    setVacancyDescription(vacancy.description);
    setVacancyPayout(vacancy.payout || '');
    setVacancyLocality(vacancy.locality);
    setVacancyName(vacancy.employerName);
    setVacancyPhone(vacancy.employerPhone);
    setVacancyTargetAudience(vacancy.targetAudience || 'all');
    setVacancyModalVisible(true);
  };

  const handleToggleVacancyStatus = async (vacancy: any) => {
    try {
      const db = firestore();
      const newStatus = vacancy.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
      await db.collection('immediate_vacancies').doc(vacancy.id).update({
        status: newStatus
      });
      Alert.alert('Success', `Vacancy broadcast is now ${newStatus === 'ACTIVE' ? 'Active' : 'Closed'}.`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update vacancy status: ' + err.message);
    }
  };

  const handleDeleteVacancy = async (vacancyId: string) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this vacancy broadcast permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = firestore();
              await db.collection('immediate_vacancies').doc(vacancyId).delete();
              Alert.alert('Success', 'Vacancy broadcast deleted.');
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete vacancy: ' + err.message);
            }
          }
        }
      ]
    );
  };

  const handleBroadcastVacancy = async () => {
    if (!organization) return;
    if (!vacancyName.trim()) {
      Alert.alert('Name Required', 'Please enter contact name.');
      return;
    }
    if (!vacancyPhone.trim()) {
      Alert.alert('Phone Required', 'Please enter contact phone.');
      return;
    }
    if (!vacancyLocality.trim()) {
      Alert.alert('Locality Required', 'Please enter target locality.');
      return;
    }
    if (!vacancyDescription.trim()) {
      Alert.alert('Description Required', 'Please enter vacancy details.');
      return;
    }

    setSendingVacancy(true);
    try {
      const db = firestore();
      const now = Date.now();
      const targetLocality = vacancyLocality.trim();

      const vacancyData = {
        employerId: organization.id,
        employerName: vacancyName.trim(),
        employerPhone: vacancyPhone.trim(),
        locality: targetLocality,
        jobCategory: vacancyCategory,
        payout: vacancyPayout.trim(),
        description: vacancyDescription.trim(),
        timestamp: editingVacancy ? editingVacancy.timestamp : now,
        status: editingVacancy ? editingVacancy.status : 'ACTIVE',
        targetAudience: vacancyTargetAudience
      };

      if (editingVacancy) {
        // UPDATE MODE
        await db.collection('immediate_vacancies').doc(editingVacancy.id).update(vacancyData);
        Alert.alert('Success', 'Broadcast vacancy updated successfully!');
      } else {
        // CREATE MODE
        await db.collection('immediate_vacancies').add(vacancyData);

        // Notify matching workers
        const matchingWorkersSnap = await db.collection('hiring_profiles')
          .where('isLookingForJob', '==', true)
          .where('locality', '==', targetLocality)
          .where('jobTitle', '==', vacancyCategory)
          .get();

        const promises: any[] = [];
        matchingWorkersSnap.forEach((doc) => {
          const worker = doc.data();
          
          // Filter matching candidates based on notice period targeting
          const workerIsOnNotice = worker.noticePeriodActive === true;
          if (vacancyTargetAudience === 'notice' && !workerIsOnNotice) return;
          if (vacancyTargetAudience === 'immediate' && workerIsOnNotice) return;

          promises.push(
            db.collection('notifications').add({
              type: 'MONEY_REQUEST', // Reused for matching workers alert type
              userId: worker.uid,
              userName: worker.name,
              organizationId: organization.id,
              message: `🚨 URGENT VACANCY: ${vacancyName.trim()} is looking for a ${vacancyCategory} in ${targetLocality}! Payout: ${vacancyPayout.trim() || 'N/A'}. Details: ${vacancyDescription.trim()}\n📞 Call: ${vacancyPhone.trim()}`,
              timestamp: now,
              read: false,
            })
          );
        });
        await Promise.all(promises);

        Alert.alert(
          'Alert Broadcasted!',
          `Your urgent vacancy for ${vacancyCategory} has been broadcasted successfully!`
        );
      }

      setVacancyModalVisible(false);
      setVacancyDescription('');
      setVacancyPayout('');
      setEditingVacancy(null);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to process broadcast: ' + error.message);
    } finally {
      setSendingVacancy(false);
    }
  };

  // Pipeline Management methods
  const openPipelineModal = (inquiry: any) => {
    setSelectedPipelineInquiry(inquiry);
    setTempStage(inquiry.status);
    setInquiryNotes(inquiry.notes || '');
    setPipelineModalVisible(true);
  };

  const handleUpdateCandidateStage = async () => {
    if (!selectedPipelineInquiry || !organization) return;
    setSavingPipelineStatus(true);
    try {
      const db = firestore();
      const now = Date.now();

      if (tempStage === 'Hired') {
        // Double confirm Hired
        Alert.alert(
          'Hire Candidate',
          `Are you sure you want to officially hire ${selectedPipelineInquiry.workerName} as a store worker for ${organization.name}? This will add them as an approved employee.`,
          [
            { text: 'Cancel', onPress: () => setSavingPipelineStatus(false), style: 'cancel' },
            {
              text: 'Confirm Hire',
              onPress: async () => {
                try {
                  // 1. Update Candidate users collection
                  await db.collection('users').doc(selectedPipelineInquiry.workerId).update({
                    organizationId: organization.id,
                    role: 'user',
                    status: 'approved',
                    isActive: true,
                    updatedAt: now,
                  });

                  // 2. Remove from public job directory
                  await db.collection('hiring_profiles').doc(selectedPipelineInquiry.workerId).delete();

                  // 3. Update job inquiry
                  await db.collection('job_inquiries').doc(selectedPipelineInquiry.id).update({
                    status: 'Hired',
                    notes: inquiryNotes.trim(),
                  });

                  // 4. Send Congrats Notification
                  await db.collection('notifications').add({
                    type: 'MONEY_REQUEST',
                    userId: selectedPipelineInquiry.workerId,
                    userName: selectedPipelineInquiry.workerName,
                    organizationId: organization.id,
                    message: `🎉 CONGRATULATIONS! You have been officially hired by ${organization.name}! Log in to start tracking your attendance.`,
                    timestamp: now,
                    read: false,
                  });

                  Alert.alert('Success', `${selectedPipelineInquiry.workerName} has been successfully hired!`);
                  setPipelineModalVisible(false);
                  fetchPipelineInquiries();
                } catch (err: any) {
                  Alert.alert('Error', err.message);
                } finally {
                  setSavingPipelineStatus(false);
                }
              }
            }
          ]
        );
      } else if (tempStage === 'Rejected') {
        // Double confirm Reject
        Alert.alert(
          'Reject Candidate',
          `Are you sure you want to mark ${selectedPipelineInquiry.workerName} as Rejected?`,
          [
            { text: 'Cancel', onPress: () => setSavingPipelineStatus(false), style: 'cancel' },
            {
              text: 'Reject',
              style: 'destructive',
              onPress: async () => {
                try {
                  await db.collection('job_inquiries').doc(selectedPipelineInquiry.id).update({
                    status: 'Rejected',
                    notes: inquiryNotes.trim(),
                  });

                  await db.collection('notifications').add({
                    type: 'MONEY_REQUEST',
                    userId: selectedPipelineInquiry.workerId,
                    userName: selectedPipelineInquiry.workerName,
                    organizationId: organization.id,
                    message: `Status Update from ${organization.name}: Your application was not selected. Keep your verified trust score high!`,
                    timestamp: now,
                    read: false,
                  });

                  Alert.alert('Success', 'Candidate status updated to Rejected.');
                  setPipelineModalVisible(false);
                  fetchPipelineInquiries();
                } catch (err: any) {
                  Alert.alert('Error', err.message);
                } finally {
                  setSavingPipelineStatus(false);
                }
              }
            }
          ]
        );
      } else {
        // Standard stage update
        await db.collection('job_inquiries').doc(selectedPipelineInquiry.id).update({
          status: tempStage,
          notes: inquiryNotes.trim(),
        });

        // Notify candidate of status update
        await db.collection('notifications').add({
          type: 'MONEY_REQUEST',
          userId: selectedPipelineInquiry.workerId,
          userName: selectedPipelineInquiry.workerName,
          organizationId: organization.id,
          message: `Hiring Update from ${organization.name}: Your status is now "${tempStage}".`,
          timestamp: now,
          read: false,
        });

        Alert.alert('Success', `Candidate status updated to ${tempStage}.`);
        setPipelineModalVisible(false);
        fetchPipelineInquiries();
        setSavingPipelineStatus(false);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update candidate: ' + error.message);
      setSavingPipelineStatus(false);
    }
  };

  // Stage customization methods
  const handleAddStage = () => {
    const trimmed = newStageName.trim();
    if (!trimmed) return;
    if (stages.includes(trimmed)) {
      Alert.alert('Stage Exists', 'This stage name already exists in your pipeline.');
      return;
    }
    setStages([...stages, trimmed]);
    setNewStageName('');
  };

  const handleRenameStage = (index: number, newName: string) => {
    const oldName = stages[index];
    const updated = [...stages];
    updated[index] = newName;
    setStages(updated);

    // Save mapping to apply upon commit
    setRenameMap((prev) => ({ ...prev, [oldName]: newName }));
  };

  const handleDeleteStage = (index: number) => {
    const stageName = stages[index];
    if (stageName === 'Hired' || stageName === 'Rejected') {
      Alert.alert('Core Stage', 'You cannot delete the "Hired" or "Rejected" stages as they drive system automation.');
      return;
    }

    Alert.alert(
      'Delete Stage',
      `Are you sure you want to delete the "${stageName}" stage? Any candidate in this stage will be moved back to "${stages[0] || 'Invited'}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = stages.filter((_, idx) => idx !== index);
            setStages(updated);
            setDeletedStages((prev) => [...prev, stageName]);
          }
        }
      ]
    );
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...stages];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setStages(updated);
  };

  const handleSaveStages = async () => {
    if (!organization?.id) return;
    if (stages.length === 0) {
      Alert.alert('Empty Pipeline', 'You must define at least one stage.');
      return;
    }

    setSavingStages(true);
    try {
      const db = firestore();
      const initialStage = stages[0] || 'Invited';

      // 1. Process Renamed Stages in inquiries
      for (const oldName of Object.keys(renameMap)) {
        const newName = renameMap[oldName];
        const snap = await db.collection('job_inquiries')
          .where('employerId', '==', organization.id)
          .where('status', '==', oldName)
          .get();

        const batch = db.batch();
        snap.forEach((doc) => {
          batch.update(doc.ref, { status: newName });
        });
        await batch.commit();
      }

      // 2. Process Deleted Stages in inquiries
      for (const delName of deletedStages) {
        const snap = await db.collection('job_inquiries')
          .where('employerId', '==', organization.id)
          .where('status', '==', delName)
          .get();

        const batch = db.batch();
        snap.forEach((doc) => {
          batch.update(doc.ref, { status: initialStage });
        });
        await batch.commit();
      }

      // 3. Save customization to Organization Document
      await db.collection('organizations').doc(organization.id).update({
        hiringStages: stages
      });

      // Update local context
      setOrganization({
        ...organization,
        hiringStages: stages
      });

      // Clean transactional states
      setRenameMap({});
      setDeletedStages([]);

      Alert.alert('Success', 'Hiring pipeline stages updated successfully!');
      fetchPipelineInquiries();
      if (!stages.includes(selectedPipelineStage)) {
        setSelectedPipelineStage(initialStage);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save stage configurations: ' + error.message);
    } finally {
      setSavingStages(false);
    }
  };

  // Rendering Helper Methods
  const renderCandidateItem = ({ item }: { item: any }) => {
    const isNotice = item.visibilityState === 'notice';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.candidateName}>{item.name}</Text>
            <Text style={styles.jobTitle}>{item.jobTitle}</Text>
          </View>
          {isNotice && (
            <View style={styles.noticeBadge}>
              <Icon name="warning" size={10} color="#D97706" />
              <Text style={styles.noticeBadgeText}>On Notice</Text>
            </View>
          )}
        </View>

        {isNotice && item.currentEmployerName && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              Currently employed at **{item.currentEmployerName}**, completing notice period.
            </Text>
          </View>
        )}

        <View style={styles.trustScoreContainer}>
          <Icon name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.trustScoreText}>
            Verified Trust Score: <Text style={styles.trustScoreHighlight}>{item.attendanceTrustDays} Days Present</Text> (98% reliability)
          </Text>
        </View>

        <Text style={styles.candidateBio} numberOfLines={2}>
          {item.bio || 'No bio description provided.'}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="calendar-outline" size={14} color={COLORS.text.secondary} />
            <Text style={styles.metaText}>{item.experienceYears}y Exp</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="cash-outline" size={14} color={COLORS.text.secondary} />
            <Text style={styles.metaText}>{item.expectedSalary || 'Negotiable'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="pin-outline" size={14} color={COLORS.text.secondary} />
            <Text style={styles.metaText}>{item.locality}</Text>
          </View>
        </View>

        {item.skills && item.skills.length > 0 && (
          <View style={styles.skillsContainer}>
            {item.skills.map((skill: string) => (
              <View key={skill} style={styles.skillPill}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.callBtn]}
            onPress={() => handleCallCandidate(item.phone)}
          >
            <Icon name="call" size={18} color={COLORS.primary} />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.whatsappBtn]}
            onPress={() => handleWhatsAppCandidate(item)}
          >
            <Icon name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.whatsappBtnText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.inviteBtn]}
            onPress={() => openInviteModal(item)}
          >
            <Icon name="send-outline" size={18} color={COLORS.white} />
            <Text style={styles.inviteBtnText}>Invite</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPipelineInquiryItem = ({ item }: { item: any }) => {
    const pendingResponse = !item.acceptedByWorker;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.avatarText, { color: '#2563EB' }]}>
              {(item.workerName || 'W').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.candidateName}>{item.workerName || 'Worker'}</Text>
            <Text style={styles.jobTitle}>{item.workerJobTitle || 'Helper'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: pendingResponse ? '#FFFBEB' : '#ECFDF5' }]}>
            <Text style={[styles.statusBadgeText, { color: pendingResponse ? '#D97706' : '#059669' }]}>
              {pendingResponse ? 'Pending Invite' : 'Accepted'}
            </Text>
          </View>
        </View>

        <View style={styles.trustScoreContainer}>
          <Icon name="ribbon" size={18} color="#2563EB" />
          <Text style={[styles.trustScoreText, { color: '#1E40AF' }]}>
            Attendance score: <Text style={{ fontWeight: 'bold' }}>{item.workerTrustDays || 0} verified present days</Text>
          </Text>
        </View>

        {item.notes && item.notes.trim() ? (
          <View style={[styles.noticeCard, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', marginTop: 12 }]}>
            <Text style={[styles.noticeText, { color: COLORS.text.secondary }]}>
              📝 **Internal Notes:** {item.notes}
            </Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.callBtn]}
            onPress={() => handleCallCandidate(item.workerPhone)}
          >
            <Icon name="call" size={18} color={COLORS.primary} />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.whatsappBtn]}
            onPress={() => handleWhatsAppCandidate(item)}
          >
            <Icon name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={styles.whatsappBtnText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, styles.inviteBtn, { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }]}
            onPress={() => openPipelineModal(item)}
          >
            <Icon name="options-outline" size={18} color={COLORS.white} />
            <Text style={styles.inviteBtnText}>Manage Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const activeStageInquiries = pipelineInquiries.filter(
    (inq) => inq.status === selectedPipelineStage
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Premium Gradient Header */}
      <View style={styles.tabHeaderContainer}>
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTitleRow}>
            <Icon name="briefcase" size={26} color={COLORS.white} />
            <Text style={styles.mainTitle}>Recruitment & Hiring</Text>
          </View>
          
          {/* Custom Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'find' && styles.tabButtonActive]}
              onPress={() => setActiveTab('find')}
            >
              <Icon name="search-outline" size={16} color={activeTab === 'find' ? '#4F46E5' : COLORS.white} />
              <Text style={[styles.tabButtonText, activeTab === 'find' && styles.tabButtonTextActive]}>
                Find Workers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'pipeline' && styles.tabButtonActive]}
              onPress={() => setActiveTab('pipeline')}
            >
              <Icon name="funnel-outline" size={16} color={activeTab === 'pipeline' ? '#4F46E5' : COLORS.white} />
              <Text style={[styles.tabButtonText, activeTab === 'pipeline' && styles.tabButtonTextActive]}>
                Pipeline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'stages' && styles.tabButtonActive]}
              onPress={() => setActiveTab('stages')}
            >
              <Icon name="settings-outline" size={16} color={activeTab === 'stages' ? '#4F46E5' : COLORS.white} />
              <Text style={[styles.tabButtonText, activeTab === 'stages' && styles.tabButtonTextActive]}>
                Configure
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* View Rendering based on active tab */}
      {activeTab === 'find' && (
        <View style={{ flex: 1 }}>
          {/* Search Header */}
          <View style={styles.searchHeader}>
            <View style={styles.searchRow}>
              <Icon name="search" size={20} color={COLORS.primary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchLocality}
                onChangeText={setSearchLocality}
                placeholder="Search by locality (e.g. Kaasganj)"
                placeholderTextColor={COLORS.text.light}
              />
              {searchLocality.length > 0 && (
                <TouchableOpacity onPress={() => setSearchLocality('')} style={styles.clearBtn}>
                  <Icon name="close-circle" size={16} color={COLORS.text.light} />
                </TouchableOpacity>
              )}
            </View>

            {/* Horizontal Category Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {categories.map((cat) => {
                const selected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterPill, selected && styles.filterPillSelected]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Broadcast Management Actions Container */}
            <View style={styles.broadcastSectionContainer}>
              <TouchableOpacity
                style={[styles.broadcastActionButton, { backgroundColor: '#EF4444' }]}
                onPress={openCreateVacancyModal}
                activeOpacity={0.8}
              >
                <Icon name="megaphone" size={16} color={COLORS.white} />
                <Text style={styles.broadcastActionText}>Broadcast Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.broadcastActionButton, { backgroundColor: '#4B5563' }]}
                onPress={() => setManageBroadcastsModalVisible(true)}
                activeOpacity={0.8}
              >
                <Icon name="list" size={16} color={COLORS.white} />
                <Text style={styles.broadcastActionText}>
                  Manage Alerts ({myBroadcasts.length})
                </Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* Candidates List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Searching verified local pool...</Text>
            </View>
          ) : (
            <FlatList
              data={candidates}
              renderItem={renderCandidateItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="people-outline" size={60} color={COLORS.text.light} />
                  <Text style={styles.emptyHeading}>No Job Seekers Found</Text>
                  <Text style={styles.emptyText}>
                    No candidates matched "{selectedCategory}" in locality "{searchLocality || 'Any'}".
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {activeTab === 'pipeline' && (
        <View style={{ flex: 1 }}>
          {/* Pipeline Horizontal stage filters */}
          <View style={styles.pipelineStageHeader}>
            <Text style={styles.pipelineTitle}>Pipeline Stages</Text>
            {loadingStages ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {stages.map((stage) => {
                  const selected = selectedPipelineStage === stage;
                  const count = pipelineInquiries.filter(inq => inq.status === stage).length;
                  return (
                    <TouchableOpacity
                      key={stage}
                      style={[styles.stageFilterPill, selected && styles.stageFilterPillSelected]}
                      onPress={() => setSelectedPipelineStage(stage)}
                    >
                      <Text style={[styles.stageFilterText, selected && styles.stageFilterTextSelected]}>
                        {stage} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {pipelineLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading recruitment pipeline...</Text>
            </View>
          ) : (
            <FlatList
              data={activeStageInquiries}
              renderItem={renderPipelineInquiryItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="funnel-outline" size={50} color={COLORS.text.light} />
                  <Text style={styles.emptyHeading}>No Candidates</Text>
                  <Text style={styles.emptyText}>
                    No candidates in the "{selectedPipelineStage}" stage.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {activeTab === 'stages' && (
        <ScrollView contentContainerStyle={styles.stagesConfigurationContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.stagesHeaderCard}>
            <Icon name="cog-outline" size={36} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stagesCardTitle}>Dynamic Hiring Pipeline</Text>
              <Text style={styles.stagesCardDesc}>
                Customize the stages candidates will go through at your shop. Save changes to update existing candidates dynamically.
              </Text>
            </View>
          </View>

          <Text style={styles.stagesListTitle}>Active Stages Pipeline</Text>

          {loadingStages ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
          ) : (
            <View style={{ gap: 10 }}>
              {stages.map((stageName, idx) => {
                const isCore = stageName === 'Hired' || stageName === 'Rejected';
                return (
                  <View key={stageName + idx} style={[styles.stageConfigRow, isCore && styles.coreStageRow]}>
                    <View style={styles.stageMoveControls}>
                      <TouchableOpacity onPress={() => handleMoveStage(idx, 'up')} disabled={idx === 0}>
                        <Icon name="chevron-up" size={18} color={idx === 0 ? '#CBD5E1' : '#64748B'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleMoveStage(idx, 'down')} disabled={idx === stages.length - 1}>
                        <Icon name="chevron-down" size={18} color={idx === stages.length - 1 ? '#CBD5E1' : '#64748B'} />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.stageNameInput}
                      value={stageName}
                      onChangeText={(newName) => handleRenameStage(idx, newName)}
                      placeholder="Enter Stage Name"
                      placeholderTextColor={COLORS.text.light}
                    />

                    {isCore ? (
                      <View style={styles.coreBadge}>
                        <Text style={styles.coreBadgeText}>System Automation</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.deleteStageBtn}
                        onPress={() => handleDeleteStage(idx)}
                      >
                        <Icon name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              <View style={styles.addStageContainer}>
                <TextInput
                  style={styles.addStageInput}
                  value={newStageName}
                  onChangeText={setNewStageName}
                  placeholder="e.g. Trial Day 2, Phone Call"
                  placeholderTextColor={COLORS.text.light}
                />
                <TouchableOpacity style={styles.addStageBtn} onPress={handleAddStage}>
                  <Icon name="add" size={20} color={COLORS.white} />
                  <Text style={styles.addStageBtnText}>Add Stage</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.saveStagesButton} onPress={handleSaveStages} disabled={savingStages}>
                {savingStages ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="save-outline" size={18} color={COLORS.white} />
                    <Text style={styles.saveStagesText}>Save Stage Configuration</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Invitations modal (from Find candidates view) */}
      <Modal
        visible={inviteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send In-App Job Invitation</Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Invite **{selectedCandidate?.name}** to connect. Your contact details will be shared once they accept.
              </Text>
              <Text style={styles.inputLabel}>Invitation Message</Text>
              <TextInput
                style={styles.textArea}
                value={inviteMessage}
                onChangeText={setInviteMessage}
                multiline={true}
                numberOfLines={4}
                placeholderTextColor={COLORS.text.light}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setInviteModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleSendInvite} disabled={sendingInvite}>
                {sendingInvite ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmBtnText}>Send Invitation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Broadcast Vacancy Modal (Supports Create and Edit) */}
      <Modal
        visible={vacancyModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setVacancyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingVacancy ? '✏️ Edit Vacancy Broadcast' : '📢 Broadcast Immediate Vacancy'}
              </Text>
              <TouchableOpacity onPress={() => setVacancyModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalText}>
                {editingVacancy
                  ? 'Update your vacancy announcement details. Workers matching this category and locality will see the updated details.'
                  : 'Broadcast an immediate hiring alert to all matching job seekers inside the target locality.'}
              </Text>

              <Text style={styles.inputLabel}>Job Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {categories.filter(c => c !== 'All').map((cat) => {
                  const selected = vacancyCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.filterPill, selected && styles.filterPillSelected]}
                      onPress={() => setVacancyCategory(cat)}
                    >
                      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Target Locality</Text>
              <TextInput
                style={[styles.addStageInput, { marginTop: 4 }]}
                value={vacancyLocality}
                onChangeText={setVacancyLocality}
                placeholder="e.g. Kaasganj"
                placeholderTextColor={COLORS.text.light}
              />

              <Text style={styles.inputLabel}>Contact Name / Store</Text>
              <TextInput
                style={[styles.addStageInput, { marginTop: 4 }]}
                value={vacancyName}
                onChangeText={setVacancyName}
                placeholder="e.g. Kirana Store"
                placeholderTextColor={COLORS.text.light}
              />

              <Text style={styles.inputLabel}>Contact Phone Number</Text>
              <TextInput
                style={[styles.addStageInput, { marginTop: 4 }]}
                value={vacancyPhone}
                onChangeText={setVacancyPhone}
                keyboardType="phone-pad"
                placeholder="e.g. +91 9999999999"
                placeholderTextColor={COLORS.text.light}
              />

              <Text style={styles.inputLabel}>Estimated Payout / Salary</Text>
              <TextInput
                style={[styles.addStageInput, { marginTop: 4 }]}
                value={vacancyPayout}
                onChangeText={setVacancyPayout}
                placeholder="e.g. ₹500/day, ₹12,000/month"
                placeholderTextColor={COLORS.text.light}
              />

              <Text style={styles.inputLabel}>Who can see this alert?</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                {([
                  { id: 'all', label: '👥 All Workers' },
                  { id: 'notice', label: '⏳ On Notice' },
                  { id: 'immediate', label: '⚡ Immediate' }
                ] as const).map((item) => {
                  const selected = vacancyTargetAudience === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.filterPill,
                        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginRight: 0 },
                        selected && styles.filterPillSelected
                      ]}
                      onPress={() => setVacancyTargetAudience(item.id)}
                    >
                      <Text style={[styles.filterText, selected && styles.filterTextSelected, { fontSize: 11 }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>


              <Text style={styles.inputLabel}>Vacancy Details (Urgent Note)</Text>
              <TextInput
                style={styles.textArea}
                value={vacancyDescription}
                onChangeText={setVacancyDescription}
                multiline={true}
                numberOfLines={4}
                placeholder="e.g. Need helper urgently for next 3 days. Payout ₹500/day. Contact immediately!"
                placeholderTextColor={COLORS.text.light}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setVacancyModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleBroadcastVacancy} disabled={sendingVacancy}>
                {sendingVacancy ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {editingVacancy ? 'Update Broadcast' : 'Broadcast Alert'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Broadcasts Modal */}
      <Modal
        visible={manageBroadcastsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setManageBroadcastsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Manage Vacancy Broadcasts</Text>
              <TouchableOpacity onPress={() => setManageBroadcastsModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={myBroadcasts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const isActive = item.status === 'ACTIVE';
                const formattedDate = item.timestamp
                  ? format(item.timestamp, 'dd MMM yyyy, hh:mm a')
                  : '';

                return (
                  <View style={styles.broadcastItemCard}>
                    <View style={styles.broadcastItemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.broadcastItemTitle}>
                          {item.jobCategory}
                        </Text>
                        <Text style={styles.broadcastItemLocality}>
                          📍 {item.locality}  •  🎯 {item.targetAudience === 'notice' ? 'On Notice' : item.targetAudience === 'immediate' ? 'Immediate Only' : 'All Workers'}
                        </Text>
                      </View>
                      
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isActive ? '#ECFDF5' : '#F3F4F6',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color: isActive ? '#059669' : '#6B7280',
                            },
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.broadcastItemDesc}>
                      {item.description}
                    </Text>

                    {item.payout ? (
                      <Text style={styles.broadcastItemPayout}>
                        💰 Payout: <Text style={{ fontWeight: '600', color: COLORS.primary }}>{item.payout}</Text>
                      </Text>
                    ) : null}

                    <View style={styles.broadcastItemFooter}>
                      <Text style={styles.broadcastItemDate}>
                        Posted {formattedDate}
                      </Text>

                      <View style={styles.broadcastActionsRow}>
                        <TouchableOpacity
                          style={[
                            styles.broadcastActionIconBtn,
                            { backgroundColor: isActive ? '#FEE2E2' : '#E0F2FE' },
                          ]}
                          onPress={() => handleToggleVacancyStatus(item)}
                        >
                          <Icon
                            name={isActive ? 'close-circle-outline' : 'play-circle-outline'}
                            size={18}
                            color={isActive ? '#EF4444' : '#0284C7'}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.broadcastActionIconBtn, { backgroundColor: '#F3F4F6' }]}
                          onPress={() => {
                            setManageBroadcastsModalVisible(false);
                            openEditVacancyModal(item);
                          }}
                        >
                          <Icon name="pencil-outline" size={18} color="#4F46E5" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.broadcastActionIconBtn, { backgroundColor: '#FEE2E2' }]}
                          onPress={() => handleDeleteVacancy(item.id)}
                        >
                          <Icon name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="megaphone-outline" size={50} color={COLORS.text.light} />
                  <Text style={styles.emptyHeading}>No Broadcasts Yet</Text>
                  <Text style={styles.emptyText}>
                    You haven't broadcasted any urgent vacancy alerts yet.
                  </Text>
                </View>
              }
            />

            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setManageBroadcastsModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Candidate Pipeline Management Modal */}
      <Modal
        visible={pipelineModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPipelineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Candidate Status</Text>
              <TouchableOpacity onPress={() => setPipelineModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalWorkerDetailsBox}>
                <Text style={styles.modalWorkerName}>{selectedPipelineInquiry?.workerName}</Text>
                <Text style={styles.modalWorkerSub}>{selectedPipelineInquiry?.workerJobTitle}</Text>
                <Text style={styles.modalWorkerTrust}>🛡️ Verified {selectedPipelineInquiry?.workerTrustDays} Days Present</Text>
              </View>

              <Text style={styles.inputLabel}>Update Hiring Stage</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {stages.map((stage) => {
                  const selected = tempStage === stage;
                  return (
                    <TouchableOpacity
                      key={stage}
                      style={[styles.stageFilterPill, selected && styles.stageFilterPillSelected]}
                      onPress={() => setTempStage(stage)}
                    >
                      <Text style={[styles.stageFilterText, selected && styles.stageFilterTextSelected]}>
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.inputLabel}>Internal Comments / Recruitment Notes</Text>
              <TextInput
                style={styles.textArea}
                value={inquiryNotes}
                onChangeText={setInquiryNotes}
                multiline={true}
                numberOfLines={4}
                placeholder="e.g. Shift trial was solid. Showed good billing speed. Let's make an offer."
                placeholderTextColor={COLORS.text.light}
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPipelineModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmBtn} 
                onPress={handleUpdateCandidateStage}
                disabled={savingPipelineStatus}
              >
                {savingPipelineStatus ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmBtnText}>Save Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabHeaderContainer: { overflow: 'hidden', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  headerGradient: { padding: 16 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  mainTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 10, padding: 4 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8 },
  tabButtonActive: { backgroundColor: COLORS.white },
  tabButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '500' },
  tabButtonTextActive: { color: '#4F46E5', fontWeight: 'bold' },
  
  searchHeader: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.text.primary },
  clearBtn: { padding: 4 },
  filterScroll: { marginTop: 12 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  filterText: { fontSize: 12, color: COLORS.text.secondary },
  filterTextSelected: { color: COLORS.primary, fontWeight: 'bold' },
  broadcastAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    gap: 10
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: COLORS.text.secondary, fontSize: 14 },
  list: { padding: 16, paddingBottom: 120 },
  
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  headerInfo: { flex: 1, marginLeft: 12 },
  candidateName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary },
  jobTitle: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  noticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noticeBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#D97706', textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  noticeCard: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  noticeText: { fontSize: 12, color: '#B45309', lineHeight: 16 },
  trustScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  trustScoreText: { fontSize: 12, color: '#047857', fontWeight: '500' },
  trustScoreHighlight: { fontWeight: 'bold', textDecorationLine: 'underline' },
  candidateBio: { fontSize: 13, color: COLORS.text.secondary, marginVertical: 12, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: COLORS.text.secondary, fontWeight: '500' },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  skillPill: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  skillText: { fontSize: 11, color: COLORS.text.secondary },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  disabledBtn: { opacity: 0.5 },
  callBtn: { backgroundColor: COLORS.white, borderColor: COLORS.primary },
  callBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  whatsappBtn: { backgroundColor: COLORS.white, borderColor: '#25D366' },
  whatsappBtnText: { color: '#25D366', fontWeight: 'bold', fontSize: 13 },
  inviteBtn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  inviteBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 13 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyHeading: { fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary, marginTop: 12 },
  emptyText: { fontSize: 13, color: COLORS.text.light, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  
  pipelineStageHeader: { backgroundColor: COLORS.white, padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pipelineTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text.secondary },
  stageFilterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center'
  },
  stageFilterPillSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  stageFilterText: { fontSize: 12, color: COLORS.text.secondary },
  stageFilterTextSelected: { color: COLORS.primary, fontWeight: 'bold' },
  
  stagesConfigurationContainer: { padding: 16, paddingBottom: 150 },
  stagesHeaderCard: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, gap: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  stagesCardTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text.primary },
  stagesCardDesc: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4, lineHeight: 16 },
  stagesListTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text.secondary, marginBottom: 12 },
  
  stageConfigRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  coreStageRow: { backgroundColor: '#F8FAFC', borderStyle: 'dashed' },
  stageMoveControls: { flexDirection: 'column', gap: 4 },
  stageNameInput: { flex: 1, fontSize: 14, color: COLORS.text.primary, paddingVertical: 4, fontWeight: '500' },
  coreBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  coreBadgeText: { fontSize: 10, color: '#047857', fontWeight: 'bold' },
  deleteStageBtn: { padding: 6 },
  
  addStageContainer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  addStageInput: { flex: 1.5, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text.primary },
  addStageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 12, gap: 4 },
  addStageBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 13 },
  saveStagesButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, marginTop: 24, gap: 8 },
  saveStagesText: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary },
  modalBody: { gap: 12 },
  modalText: { fontSize: 14, color: COLORS.text.secondary, lineHeight: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary, marginTop: 12 },
  textArea: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, height: 80, textAlignVertical: 'top', fontSize: 14, color: COLORS.text.primary, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: COLORS.text.secondary, fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: COLORS.white, fontWeight: 'bold' },
  
  modalWorkerDetailsBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: COLORS.primary, marginBottom: 10 },
  modalWorkerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary },
  modalWorkerSub: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  modalWorkerTrust: { fontSize: 12, color: '#2563EB', fontWeight: 'bold', marginTop: 6 },

  // Broadcasts CRUD styles
  broadcastSectionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 4,
  },
  broadcastActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  broadcastActionText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  broadcastItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  broadcastItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  broadcastItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  broadcastItemLocality: {
    fontSize: 12,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  broadcastItemDesc: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginVertical: 8,
  },
  broadcastItemPayout: {
    fontSize: 13,
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  broadcastItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 4,
  },
  broadcastItemDate: {
    fontSize: 11,
    color: COLORS.text.light,
  },
  broadcastActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  broadcastActionIconBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

