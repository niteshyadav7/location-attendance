import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Notice } from '../types';

interface NoticeModalProps {
  notice: Notice | null;
  visible: boolean;
  onClose: () => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({ notice, visible, onClose }) => {
  if (!notice) return null;

  const getPriorityColor = () => {
    switch (notice.priority) {
      case 'urgent':
        return '#E74C3C';
      case 'high':
        return '#F39C12';
      case 'medium':
        return '#3498DB';
      case 'low':
        return '#95A5A6';
      default:
        return '#95A5A6';
    }
  };

  const getPriorityIcon = () => {
    switch (notice.priority) {
      case 'urgent':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return 'ℹ️';
      case 'low':
        return '📌';
      default:
        return '📌';
    }
  };

  const getPriorityLabel = () => {
    switch (notice.priority) {
      case 'urgent':
        return 'URGENT';
      case 'high':
        return 'HIGH PRIORITY';
      case 'medium':
        return 'MEDIUM PRIORITY';
      case 'low':
        return 'INFO';
      default:
        return 'INFO';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Priority Badge */}
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() }]}>
            <Text style={styles.priorityIcon}>{getPriorityIcon()}</Text>
            <Text style={styles.priorityText}>{getPriorityLabel()}</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{notice.title}</Text>
            <Text style={styles.date}>📅 {formatDate(notice.createdAt)}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.message}>{notice.message}</Text>
            
            {notice.expiresAt && (
              <View style={styles.expiryContainer}>
                <Text style={styles.expiryText}>
                  ⏰ Valid until: {formatDate(notice.expiresAt)}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: getPriorityColor() }]} 
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(20),
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(12),
    gap: moderateScale(8),
  },
  priorityIcon: {
    fontSize: moderateScale(24),
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  contentContainer: {
    padding: moderateScale(24),
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: moderateScale(8),
    lineHeight: moderateScale(32),
  },
  date: {
    fontSize: moderateScale(13),
    color: '#6B7280',
    marginBottom: moderateScale(16),
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: moderateScale(16),
  },
  message: {
    fontSize: moderateScale(16),
    color: '#374151',
    lineHeight: moderateScale(24),
    marginBottom: moderateScale(16),
  },
  expiryContainer: {
    backgroundColor: '#FEF3C7',
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  expiryText: {
    fontSize: moderateScale(13),
    color: '#92400E',
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: 'bold',
  },
});
