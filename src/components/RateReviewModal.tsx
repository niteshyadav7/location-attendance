import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants/theme';
import firestore from '@react-native-firebase/firestore';

interface RateReviewModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userSkills: string[];
  userVerifiedSkills?: any[];
  userOrgId: string;
  userOrgName: string;
  onSuccess: () => void;
}

export const RateReviewModal: React.FC<RateReviewModalProps> = ({
  visible,
  onClose,
  userId,
  userName,
  userSkills = [],
  userVerifiedSkills = [],
  userOrgId,
  userOrgName,
  onSuccess,
}) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [endorsedSkills, setEndorsedSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const tags = [
    'Highly Punctual',
    'Honest',
    'Excellent Customer Handling',
    'Good Billing Speed',
    'Fast Learner',
    'Hard Worker',
  ];

  useEffect(() => {
    if (visible) {
      setRating(5);
      setSelectedTags([]);
      // Pre-select already verified skills from this org, if any
      const alreadyEndorsed = userVerifiedSkills
        .filter((s: any) => s.verifiedByOrgId === userOrgId)
        .map((s: any) => s.name);
      setEndorsedSkills(alreadyEndorsed);
    }
  }, [visible]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleToggleSkill = (skill: string) => {
    setEndorsedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const db = firestore();
      const now = Date.now();

      // 1. Create the new Review item
      const newReview = {
        rating,
        tags: selectedTags,
        reviewedBy: userOrgId, // Org ID
        reviewerOrgId: userOrgId,
        reviewerOrgName: userOrgName,
        timestamp: now,
      };

      // 2. Map the newly checked skills as Endorsed SkillItems
      const newSkillItems = endorsedSkills.map((skillName) => ({
        name: skillName,
        verified: true,
        verifiedByOrgId: userOrgId,
        verifiedByOrgName: userOrgName,
        verifiedAt: now,
      }));

      // 3. Fetch current user document to prevent overwriting other reviews/endorsements
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      
      let currentReviews = [];
      let currentVerifiedSkills = [];
      if (userSnap.exists()) {
        const userData = userSnap.data();
        currentReviews = userData?.reviews || [];
        // Filter out old reviews from same organization to prevent double review spamming
        currentReviews = currentReviews.filter((r: any) => r.reviewerOrgId !== userOrgId);
        
        currentVerifiedSkills = userData?.verifiedSkills || [];
        // Filter out old skill endorsements from same organization to refresh
        currentVerifiedSkills = currentVerifiedSkills.filter((s: any) => s.verifiedByOrgId !== userOrgId);
      }

      const updatedReviews = [...currentReviews, newReview];
      const updatedVerifiedSkills = [...currentVerifiedSkills, ...newSkillItems];

      // Calculate new average rating
      const totalStars = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = updatedReviews.length > 0 ? totalStars / updatedReviews.length : 5;

      // 4. Write to User Document
      await userRef.update({
        reviews: updatedReviews,
        verifiedSkills: updatedVerifiedSkills,
        averageRating,
      });

      // 5. If hiring profile exists, sync the reviews and skill endorsements
      const profileRef = db.collection('hiring_profiles').doc(userId);
      const profileSnap = await profileRef.get();
      if (profileSnap.exists()) {
        await profileRef.update({
          reviews: updatedReviews,
          verifiedSkills: updatedVerifiedSkills,
          averageRating,
        });
      }

      // 6. Push a Firestore Notification to the worker
      await db.collection('notifications').add({
        type: 'MONEY_APPROVED', // Used as a generic slots wrapper
        userId: userId,
        userName: userName,
        organizationId: userOrgId,
        message: `⭐ ${userOrgName} endorsed your skills and left you a ${rating}-star review!`,
        timestamp: now,
        read: false,
      });

      Alert.alert('Review Submitted', `Thank you! Your verified rating and skill endorsements have been published.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      Alert.alert('Submission Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Endorse & Review Staff</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Icon name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalInstruction}>
              Help **{userName}** build their local verified trust score. Rate their reliability and endorse their work skills.
            </Text>

            {/* Star Selector */}
            <Text style={styles.sectionLabel}>1. Overall Star Rating</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={{ padding: 4 }}
                >
                  <Icon
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Behavior Tags Selector */}
            <Text style={styles.sectionLabel}>2. Select Behaviour Tags</Text>
            <View style={styles.tagGrid}>
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagPill, isSelected && styles.tagPillSelected]}
                    onPress={() => handleToggleTag(tag)}
                  >
                    <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Skill Endorsements Checklist */}
            <Text style={styles.sectionLabel}>3. Endorse Listed Skills</Text>
            {userSkills.length === 0 ? (
              <Text style={styles.emptyText}>Worker has not listed any skills on their profile yet.</Text>
            ) : (
              <View style={styles.skillsList}>
                {userSkills.map((skill) => {
                  const isEndorsed = endorsedSkills.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      style={styles.skillCheckRow}
                      onPress={() => handleToggleSkill(skill)}
                    >
                      <Icon
                        name={isEndorsed ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isEndorsed ? COLORS.primary : COLORS.text.light}
                      />
                      <Text style={[styles.skillCheckLabel, isEndorsed && styles.skillCheckLabelSelected]}>
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.confirmBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  modalInstruction: {
    fontSize: 13,
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 10,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagPillSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  tagText: {
    fontSize: 11,
    color: COLORS.text.secondary,
  },
  tagTextSelected: {
    color: '#B45309',
    fontWeight: 'bold',
  },
  skillsList: {
    gap: 8,
  },
  skillCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  skillCheckLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  skillCheckLabelSelected: {
    color: COLORS.text.primary,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.text.light,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.text.secondary,
    fontWeight: 'bold',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
});
