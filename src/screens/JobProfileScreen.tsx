import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../constants/theme';
import firestore from '@react-native-firebase/firestore';
import { format } from 'date-fns';

export const JobProfileScreen = ({ navigation }: any) => {
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);

  // Profile Fields
  const [isLookingForJob, setIsLookingForJob] = useState(false);
  const [jobTitle, setJobTitle] = useState('Kirana Helper');
  const [locality, setLocality] = useState('Kaasganj');
  const [experienceYears, setExperienceYears] = useState('0');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [phone, setPhone] = useState('');

  // Notice Period States
  const [noticePeriodActive, setNoticePeriodActive] = useState(false);
  const [noticeEndDate, setNoticeEndDate] = useState<number | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalPresentDays, setTotalPresentDays] = useState(0);
  const [jobInquiries, setJobInquiries] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [verifiedSkills, setVerifiedSkills] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(5);
  const [immediateVacancies, setImmediateVacancies] = useState<any[]>([]);

  // Skill Categories Selection
  const categories = [
    'Kirana Helper',
    'Billing Operator',
    'Accountant',
    'Store Manager',
    'Delivery & Driver',
    'Sales Associate',
  ];

  useEffect(() => {
    if (user?.uid) {
      loadProfileAndStats();
    }
  }, [user?.uid]);

  const loadProfileAndStats = async () => {
    try {
      setLoading(true);
      const db = firestore();

      // 1. Load User Details & Job Search Status
      const userDoc = await db.collection('users').doc(user?.uid).get();
      let workerNoticeActive = false;
      let workerLocality = 'Kaasganj';
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData) {
          setIsLookingForJob(userData.isLookingForJob || false);
          setJobTitle(userData.jobTitle || 'Kirana Helper');
          setLocality(userData.locality || 'Kaasganj');
          workerLocality = userData.locality || 'Kaasganj';
          setExperienceYears(String(userData.experienceYears || '0'));
          setExpectedSalary(userData.expectedSalary || '');
          setBio(userData.bio || '');
          setSkills(userData.skills ? userData.skills.join(', ') : '');
          setPhone(userData.phoneNumber || userData.phone || '');
          setNoticePeriodActive(userData.noticePeriodActive || false);
          workerNoticeActive = userData.noticePeriodActive || false;
          setNoticeEndDate(userData.noticeEndDate || null);
          setReviews(userData.reviews || []);
          setVerifiedSkills(userData.verifiedSkills || []);
          setAverageRating(userData.averageRating || 5);
        }
      }

      // 2. Load Attendance Trust Stats (Aggregating past present records)
      const attendanceQuery = await db
        .collection('attendance')
        .where('userId', '==', user?.uid)
        .get();

      let presentCount = 0;
      attendanceQuery.forEach((doc) => {
        const record = doc.data();
        if (record.status === 'PRESENT' || record.status === 'CHECKED_OUT') {
          presentCount++;
        }
      });
      setTotalPresentDays(presentCount);

      // 3. Load In-App Job Inquiries
      const inquiriesSnapshot = await db
        .collection('job_inquiries')
        .where('workerId', '==', user?.uid)
        .get();

      const inquiriesList: any[] = [];
      inquiriesSnapshot.forEach((doc) => {
        inquiriesList.push({ id: doc.id, ...doc.data() });
      });
      // Sort: newest first
      setJobInquiries(inquiriesList.sort((a, b) => b.timestamp - a.timestamp));

      // 4. Load Active Urgent Vacancies in their locality
      const vacanciesSnapshot = await db
        .collection('immediate_vacancies')
        .where('locality', '==', workerLocality)
        .where('status', '==', 'ACTIVE')
        .get();

      const vacanciesList: any[] = [];
      vacanciesSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Filter based on targetAudience targeting matching worker's notice period status
        if (data.targetAudience === 'notice' && !workerNoticeActive) return;
        if (data.targetAudience === 'immediate' && workerNoticeActive) return;

        vacanciesList.push({ id: doc.id, ...data });
      });
      setImmediateVacancies(vacanciesList.sort((a, b) => b.timestamp - a.timestamp));

    } catch (error: any) {
      console.error('Error loading job profile details:', error);
      Alert.alert('Error', 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleJobSearch = (value: boolean) => {
    setIsLookingForJob(value);
    if (!value) {
      setNoticePeriodActive(false);
      setNoticeEndDate(null);
    }
  };

  const handleToggleNoticePeriod = (value: boolean) => {
    setNoticePeriodActive(value);
    if (value) {
      const epoch30Days = Date.now() + 30 * 24 * 60 * 60 * 1000;
      setNoticeEndDate(epoch30Days);
    } else {
      setNoticeEndDate(null);
    }
  };


  const handleSaveProfile = async () => {
    if (!locality.trim()) {
      Alert.alert('Locality Required', 'Please enter your locality (e.g. Kaasganj).');
      return;
    }
    if (isLookingForJob && !phone.trim()) {
      Alert.alert('Phone Required', 'A valid phone number is required to receive inquiries.');
      return;
    }

    setSaving(true);
    try {
      const db = firestore();
      const parsedExperience = parseInt(experienceYears, 10) || 0;
      const skillsArray = skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      // 1. Update User collection
      const userUpdates: any = {
        isLookingForJob,
        jobTitle,
        locality: locality.trim(),
        experienceYears: parsedExperience,
        expectedSalary: expectedSalary.trim(),
        bio: bio.trim(),
        skills: skillsArray,
        phone: phone.trim(),
        noticePeriodActive,
        noticeEndDate,
        updatedAt: Date.now(),
      };
      await db.collection('users').doc(user?.uid).update(userUpdates);

      // 2. Update Public Search Directory
      if (isLookingForJob) {
        // If employee has active notice period toggle, set visibilityState as 'notice', otherwise 'active'
        const visibilityState = noticePeriodActive ? 'notice' : 'active';
        
        await db.collection('hiring_profiles').doc(user?.uid).set({
          uid: user?.uid,
          name: user?.name || 'Local Worker',
          email: user?.email || '',
          phone: phone.trim(),
          locality: locality.trim(),
          jobTitle,
          skills: skillsArray,
          experienceYears: parsedExperience,
          bio: bio.trim(),
          expectedSalary: expectedSalary.trim(),
          isLookingForJob: true,
          visibilityState,
          currentEmployerId: user?.organizationId || null,
          currentEmployerName: organization?.name || null,
          attendanceTrustDays: totalPresentDays,
          avgAttendanceRate: 98, // Mock average, can be derived
          updatedAt: Date.now(),
        });
      } else {
        // Remove from public directory if job search is toggled off
        await db.collection('hiring_profiles').doc(user?.uid).delete();
      }

      Alert.alert('Success', 'Your job profile was updated successfully!');
      loadProfileAndStats();
    } catch (error: any) {
      console.error('Error saving job profile:', error);
      Alert.alert('Error', 'Failed to update job profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleShareProfileToWhatsapp = () => {
    let cardText = `🌟 *VERIFIED WORKER TRUST CARD* 🌟\n`;
    cardText += `--------------------------------------\n`;
    cardText += `👤 *Name:* ${user?.name || 'Local Worker'}\n`;
    cardText += `💼 *Job Title:* ${jobTitle}\n`;
    cardText += `📍 *Locality:* ${locality || 'Kaasganj'}\n`;
    cardText += `🛡️ *Attendance Score:* *${totalPresentDays} Verified Days Present*\n`;
    
    if (reviews.length > 0) {
      cardText += `⭐ *System Rating:* *${averageRating.toFixed(1)} / 5.0* (${reviews.length} reviews)\n`;
    }
    
    if (verifiedSkills.length > 0) {
      cardText += `\n✅ *Employer Endorsed Skills:*\n`;
      verifiedSkills.forEach((s: any) => {
        cardText += `  ✓ ${s.name} (Verified by ${s.verifiedByOrgName})\n`;
      });
    }

    if (bio.trim()) {
      cardText += `\n📝 *Worker Bio:* "${bio.trim()}"\n`;
    }

    cardText += `--------------------------------------\n`;
    cardText += `_Verified via Location Attendance App_`;

    const shareUrl = `whatsapp://send?text=${encodeURIComponent(cardText)}`;
    
    Linking.canOpenURL(shareUrl).then((supported) => {
      if (supported) {
        Linking.openURL(shareUrl);
      } else {
        const { Share } = require('react-native');
        Share.share({ message: cardText });
      }
    }).catch(() => {
      const { Share } = require('react-native');
      Share.share({ message: cardText });
    });
  };

  const handleAcceptInquiry = async (inquiryId: string, employerPhone: string, employerName: string) => {
    try {
      setLoading(true);
      await firestore().collection('job_inquiries').doc(inquiryId).update({
        status: 'ACCEPTED',
      });
      
      Alert.alert(
        'Inquiry Accepted',
        `You have shared your contact details with ${employerName}. You can call them directly or text them on WhatsApp.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'WhatsApp Owner',
            onPress: () => {
              const url = `whatsapp://send?phone=${employerPhone}&text=${encodeURIComponent(
                `Hello ${employerName}, I have accepted your job invitation on GeoAttendance! I would love to discuss the details.`
              )}`;
              Linking.openURL(url).catch(() => {
                Linking.openURL(`https://wa.me/${employerPhone}`);
              });
            },
          },
        ]
      );
      loadProfileAndStats();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to accept inquiry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInquiry = async (inquiryId: string) => {
    try {
      setLoading(true);
      await firestore().collection('job_inquiries').doc(inquiryId).update({
        status: 'REJECTED',
      });
      Alert.alert('Inquiry Declined', 'The shop invitation has been declined.');
      loadProfileAndStats();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Gradient */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={COLORS.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Icon name="briefcase" size={32} color={COLORS.white} />
              <Text style={styles.headerTitle}>Hiring & Job Profile</Text>
              <Text style={styles.headerSubtitle}>Verified Local Hiring Pool (Kaasganj)</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Visibility Controller */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.cardHeading}>Local Job Search Directory</Text>
              <Text style={styles.cardDescription}>
                List yourself in Kaasganj's local shop worker directory.
              </Text>
            </View>
            <Switch
              value={isLookingForJob}
              onValueChange={handleToggleJobSearch}
              trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          {isLookingForJob && (
            <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.cardHeading, { fontSize: 14 }]}>Search with Notice Period (30 Days)</Text>
                  <Text style={[styles.cardDescription, { marginTop: 2 }]}>
                    Toggle ON if you want to complete 30 days notice. Toggle OFF to list as immediately available.
                  </Text>
                </View>
                <Switch
                  value={noticePeriodActive}
                  onValueChange={handleToggleNoticePeriod}
                  trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              </View>
              
              <View style={styles.visibleNotice}>
                <Icon name="checkmark-circle" size={20} color={COLORS.status.working} />
                <Text style={styles.visibleNoticeText}>
                  {noticePeriodActive
                    ? `Visible to local employers as (Employed - On Notice) until ${
                        noticeEndDate ? format(noticeEndDate, 'MMM dd, yyyy') : 'notice expiration'
                      }.`
                    : 'You are listed as Immediately Available in Kaasganj.'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Verified Trust Badge Card */}
        <View style={styles.trustCard}>
          <View style={styles.row}>
            <View style={styles.badgeIconCircle}>
              <Icon name="ribbon" size={26} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.cardHeading, { color: '#047857' }]}>
                ✓ Verified System Trust Card
              </Text>
              <Text style={styles.trustScoreNumber}>{totalPresentDays} Days Present</Text>
              <Text style={styles.cardDescription}>
                Your experience score is automatically calculated from daily geofenced check-ins. Other shop owners see this badge as proof of your reliability!
              </Text>
              
              {reviews.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Icon name="star" size={16} color="#F59E0B" />
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.text.primary }}>
                    {averageRating.toFixed(1)} / 5.0 Rating
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.text.secondary }}>
                    ({reviews.length} reviews)
                  </Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleShareProfileToWhatsapp}
                style={styles.whatsappShareBtn}
              >
                <Icon name="logo-whatsapp" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                  Share Trust Card to WhatsApp
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Verified Employer Endorsements & Skills Badges */}
        {verifiedSkills.length > 0 && (
          <View style={styles.endorsementsCard}>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>✓ Employer Endorsed Skills</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {verifiedSkills.map((item: any, idx: number) => (
                <View key={idx} style={[styles.skillPill, { backgroundColor: '#EEF2FF', borderColor: COLORS.primary, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  <Icon name="checkmark-circle" size={14} color={COLORS.primary} />
                  <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: 'bold' }}>
                    {item.name} (Verified by {item.verifiedByOrgName})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Shop Owner Reviews & Feed */}
        {reviews.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>⭐ Shop Owner Reviews ({reviews.length})</Text>
            {reviews.map((rev: any, idx: number) => (
              <View key={idx} style={styles.reviewCard}>
                <View style={styles.rowBetween}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.text.primary }}>{rev.reviewerOrgName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="star" size={14} color="#F59E0B" />
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: COLORS.text.primary }}>{rev.rating}.0</Text>
                  </View>
                </View>
                
                {rev.tags && rev.tags.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 6 }}>
                    {rev.tags.map((t: string) => (
                      <View key={t} style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 9, color: '#B45309', fontWeight: 'bold' }}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                <Text style={{ fontSize: 11, color: COLORS.text.light, marginTop: 4 }}>
                  Reviewed on {format(rev.timestamp, 'MMM dd, yyyy')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Job Fields Editor */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Job Profile Settings</Text>

          <Text style={styles.inputLabel}>Locality / Town</Text>
          <View style={styles.inputContainer}>
            <Icon name="pin-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={locality}
              onChangeText={setLocality}
              placeholder="e.g. Kaasganj"
              placeholderTextColor={COLORS.text.light}
            />
          </View>

          <Text style={styles.inputLabel}>Skill Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat) => {
              const selected = jobTitle === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, selected && styles.categoryPillSelected]}
                  onPress={() => setJobTitle(cat)}
                >
                  <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.inputLabel}>Mobile Phone (Contact Details)</Text>
          <View style={styles.inputContainer}>
            <Icon name="phone-portrait-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="10 digit number"
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.text.light}
            />
          </View>

          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.inputLabel}>Years Experience</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { paddingLeft: 12 }]}
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={COLORS.text.light}
                />
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.inputLabel}>Expected Salary</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { paddingLeft: 12 }]}
                  value={expectedSalary}
                  onChangeText={setExpectedSalary}
                  placeholder="e.g. 10000/month"
                  placeholderTextColor={COLORS.text.light}
                />
              </View>
            </View>
          </View>

          <Text style={styles.inputLabel}>Skills Tags (comma separated)</Text>
          <View style={styles.inputContainer}>
            <Icon name="code-working-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={skills}
              onChangeText={setSkills}
              placeholder="Kirana, Billing, Excel, Tally"
              placeholderTextColor={COLORS.text.light}
            />
          </View>

          <Text style={styles.inputLabel}>About Me (Bio)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Write a brief intro about yourself for local shop owners to see..."
            multiline={true}
            numberOfLines={4}
            placeholderTextColor={COLORS.text.light}
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={saving}>
            <LinearGradient
              colors={COLORS.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save Job Profile</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Urgent Local Vacancies */}
        {isLookingForJob && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🚨 Urgent Vacancies in {locality || 'Kaasganj'} ({immediateVacancies.length})</Text>

            {immediateVacancies.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="megaphone-outline" size={40} color={COLORS.text.light} />
                <Text style={styles.emptyText}>No active urgent vacancy broadcasts in your locality right now.</Text>
              </View>
            ) : (
              immediateVacancies.map((vac) => (
                <View key={vac.id} style={styles.inquiryCard}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inquiryShopName}>{vac.employerName}</Text>
                      <Text style={[styles.jobTitle, { color: COLORS.primary, fontWeight: 'bold', marginTop: 2 }]}>
                        Looking for: {vac.jobCategory}
                      </Text>
                      <Text style={styles.inquiryTime}>
                        Posted {format(vac.timestamp, 'MMM dd, h:mm a')}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2', height: 22, justifyContent: 'center' }]}>
                      <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>
                        Urgent
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.inquiryMessage, { marginTop: 10 }]}>{vac.description}</Text>

                  {vac.payout ? (
                    <Text style={{ fontSize: 13, color: '#374151', marginTop: 8, fontWeight: '500' }}>
                      💰 Estimated Payout: <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{vac.payout}</Text>
                    </Text>
                  ) : null}


                  <View style={styles.inquiryActions}>
                    <TouchableOpacity 
                      style={[styles.inquiryBtn, styles.declineBtn, { borderColor: '#25D366', borderWidth: 1, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                      onPress={() => {
                        const url = `whatsapp://send?phone=${vac.employerPhone}&text=${encodeURIComponent(
                          `Hello ${vac.employerName}, I saw your urgent vacancy alert for a ${vac.jobCategory} in ${vac.locality} on the GeoAttendance app. I am interested and immediately available!`
                        )}`;
                        Linking.openURL(url).catch(() => {
                          Linking.openURL(`https://wa.me/${vac.employerPhone}`);
                        });
                      }}
                    >
                      <Icon name="logo-whatsapp" size={14} color="#25D366" />
                      <Text style={[styles.declineBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.inquiryBtn, styles.acceptBtn, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                      onPress={() => {
                        Linking.openURL(`tel:${vac.employerPhone}`).catch(() => {
                          Alert.alert('Error', 'Cannot launch dialer.');
                        });
                      }}
                    >
                      <Icon name="call" size={14} color="#fff" />
                      <Text style={styles.acceptBtnText}>Call Owner</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Job Inquiries inbox */}
        {isLookingForJob && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📥 Shop Job Invitations ({jobInquiries.length})</Text>

            {jobInquiries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="mail-unread-outline" size={40} color={COLORS.text.light} />
                <Text style={styles.emptyText}>No job invitations received yet. Keep your trust score high to attract local owners!</Text>
              </View>
            ) : (
              jobInquiries.map((inquiry) => {
                const isRejected = inquiry.status === 'Rejected' || inquiry.status === 'REJECTED';
                const isHired = inquiry.status === 'Hired' || inquiry.status === 'HIRED';
                const isPending = !inquiry.acceptedByWorker && !isRejected && !isHired;
                const isAccepted = inquiry.acceptedByWorker && !isRejected && !isHired;
                
                let badgeBgColor = '#FEF3C7';
                let badgeTextColor = '#D97706';
                let badgeLabel = 'Pending';
                
                if (isHired) {
                  badgeBgColor = '#D1FAE5';
                  badgeTextColor = '#059669';
                  badgeLabel = 'Hired 🎉';
                } else if (isRejected) {
                  badgeBgColor = '#FEE2E2';
                  badgeTextColor = '#EF4444';
                  badgeLabel = 'Rejected';
                } else if (isAccepted) {
                  badgeBgColor = '#DBEAFE';
                  badgeTextColor = '#1E40AF';
                  badgeLabel = inquiry.status; // Shows the actual stage name
                }

                return (
                  <View key={inquiry.id} style={styles.inquiryCard}>
                    <View style={styles.rowBetween}>
                      <View>
                        <Text style={styles.inquiryShopName}>{inquiry.employerName}</Text>
                        <Text style={styles.inquiryTime}>
                          {format(inquiry.timestamp, 'MMM dd, h:mm a')}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { 
                        backgroundColor: badgeBgColor 
                      }]}>
                        <Text style={[styles.statusBadgeText, { 
                          color: badgeTextColor 
                        }]}>
                          {badgeLabel}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.inquiryMessage}>{inquiry.message}</Text>

                    {isPending && (
                      <View style={styles.inquiryActions}>
                        <TouchableOpacity 
                          style={[styles.inquiryBtn, styles.declineBtn]}
                          onPress={() => handleDeclineInquiry(inquiry.id)}
                        >
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.inquiryBtn, styles.acceptBtn]}
                          onPress={() => handleAcceptInquiry(inquiry.id, inquiry.employerPhone, inquiry.employerName)}
                        >
                          <Text style={styles.acceptBtnText}>Accept Invite</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {(isAccepted || isHired) && (
                      <View style={styles.contactDetails}>
                        <Text style={styles.contactText}>📞 Contact Number: {inquiry.employerPhone}</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                          <TouchableOpacity 
                            style={[styles.chatBtn, { flex: 1, backgroundColor: COLORS.primary }]}
                            onPress={() => {
                              Linking.openURL(`tel:${inquiry.employerPhone}`).catch(() => {
                                Alert.alert('Error', 'Cannot launch dialer.');
                              });
                            }}
                          >
                            <Icon name="call" size={16} color={COLORS.white} />
                            <Text style={styles.chatBtnText}>Call Owner</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={[styles.chatBtn, { flex: 1.2, backgroundColor: '#25D366' }]}
                            onPress={() => {
                              const url = `whatsapp://send?phone=${inquiry.employerPhone}&text=${encodeURIComponent(
                                `Hello ${inquiry.employerName}, I saw your inquiry on GeoAttendance!`
                              )}`;
                              Linking.openURL(url).catch(() => {
                                Linking.openURL(`https://wa.me/${inquiry.employerPhone}`);
                              });
                            }}
                          >
                            <Icon name="logo-whatsapp" size={16} color={COLORS.white} />
                            <Text style={styles.chatBtnText}>WhatsApp Chat</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

      </ScrollView>



    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, paddingBottom: 60 },
  headerContainer: { overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerGradient: { padding: 24, alignItems: 'center' },
  headerContent: { alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.85)' },
  card: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  cardHeading: { fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary },
  cardDescription: { fontSize: 12, color: COLORS.text.secondary, marginTop: 4, lineHeight: 16 },
  visibleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  visibleNoticeText: { flex: 1, fontSize: 11, color: '#047857', fontWeight: '500' },
  badgeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustScoreNumber: { fontSize: 24, fontWeight: 'bold', color: '#10B981', marginVertical: 4 },
  trustCard: {
    backgroundColor: COLORS.white,
    padding: 18,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderLeftWidth: 5,
    borderLeftColor: '#10B981',
    elevation: 3,
    shadowColor: '#10B981',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  whatsappShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    gap: 8,
    elevation: 2,
    shadowColor: '#25D366',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  endorsementsCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  reviewCard: {
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary, marginBottom: 12 },
  jobTitle: { fontSize: 13, color: COLORS.text.secondary, marginTop: 2 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text.primary, marginTop: 12, marginBottom: 6 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  inputIcon: { paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14, color: COLORS.text.primary },
  textArea: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, height: 80, textAlignVertical: 'top', marginTop: 6, fontSize: 14, color: COLORS.text.primary },
  categoryScroll: { marginVertical: 6 },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  categoryText: { fontSize: 12, color: COLORS.text.secondary },
  categoryTextSelected: { color: COLORS.primary, fontWeight: 'bold' },
  saveButton: {
    marginTop: 20,
  },
  saveButtonGradient: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  saveButtonText: { color: COLORS.white, fontSize: 15, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 13, color: COLORS.text.light, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  inquiryCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  inquiryShopName: { fontSize: 15, fontWeight: 'bold', color: COLORS.text.primary },
  inquiryTime: { fontSize: 11, color: COLORS.text.light, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  inquiryMessage: { fontSize: 13, color: COLORS.text.secondary, marginVertical: 10, lineHeight: 18 },
  inquiryActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  inquiryBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  declineBtn: { backgroundColor: '#FEE2E2' },
  declineBtnText: { color: '#EF4444', fontWeight: 'bold', fontSize: 12 },
  acceptBtn: { backgroundColor: COLORS.primary },
  acceptBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 12 },
  contactDetails: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
    alignItems: 'center',
  },
  contactText: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 10,
  },
  chatBtnText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary },
  modalBody: { gap: 12 },
  modalText: { fontSize: 14, color: COLORS.text.secondary, lineHeight: 20 },
  modalTextHighlight: { fontSize: 14, fontWeight: 'bold', color: '#EF4444', marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: COLORS.text.secondary, fontWeight: 'bold' },
  confirmBtn: { flex: 2, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: COLORS.white, fontWeight: 'bold' },
  skillPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
});
