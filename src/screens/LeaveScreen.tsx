import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAds } from '../hooks/useAds';
import { useAuthStore } from '../store/useAuthStore';
import { LeaveRequest, Notice } from '../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { COLORS } from '../constants/theme';
import { useLeaves, useNotices } from '../hooks/useLeaves';



import DatePicker from 'react-native-date-picker';

export const LeaveScreen = () => {
  const user = useAuthStore((state) => state.user);
  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('leaves');
  const [activeTab, setActiveTab] = useState<'leaves' | 'notices'>('leaves');
  
  // Custom Hooks
  const { leaves, loading: loadingLeaves, submitLeaveRequest, deleteLeave, updateLeave } = useLeaves(user);
  const { notices, loading: loadingNotices } = useNotices();

  // Local State
  const [modalVisible, setModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);

  const handleRequest = async () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setSubmitting(true);
    try {
        if (editingLeaveId) {
            await updateLeave(
                editingLeaveId,
                format(startDate, 'yyyy-MM-dd'), 
                format(endDate, 'yyyy-MM-dd'), 
                reason
            );
            Alert.alert('Success', 'Leave request updated');
        } else {
            await submitLeaveRequest(
              format(startDate, 'yyyy-MM-dd'), 
              format(endDate, 'yyyy-MM-dd'), 
              reason
            );
            Alert.alert('Success', 'Leave request submitted');
        }
        
        closeModal();
    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setSubmitting(false);
    }
  };

  const closeModal = () => {
      setModalVisible(false);
      setEditingLeaveId(null);
      setStartDate(new Date());
      setEndDate(new Date());
      setReason('');
  };

  const handleEdit = (item: LeaveRequest) => {
      setEditingLeaveId(item.id);
      setStartDate(new Date(item.startDate));
      setEndDate(new Date(item.endDate));
      setReason(item.reason);
      setModalVisible(true);
  };

  const handleDelete = (id: string) => {
      Alert.alert(
          'Delete Request',
          'Are you sure you want to delete this leave request?',
          [
              { text: 'Cancel', style: 'cancel' },
              { 
                  text: 'Delete', 
                  style: 'destructive', 
                  onPress: async () => {
                      try {
                          await deleteLeave(id);
                      } catch (error: any) {
                          Alert.alert('Error', 'Failed to delete request');
                      }
                  }
              }
          ]
      );
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'alert-circle';
      case 'high': return 'warning';
      case 'normal': return 'information-circle';
      default: return 'chatbox-ellipses';
    }
  };

  const handleOpenAppUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open the app link');
    }
  };

  const renderLeaveItem = ({ item }: { item: LeaveRequest }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.date}>{item.startDate} to {item.endDate}</Text>
        <View style={[styles.badge, { backgroundColor: COLORS.leaveStatus[item.status as keyof typeof COLORS.leaveStatus] || COLORS.leaveStatus.PENDING }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.reason}>{item.reason}</Text>
      
      <View style={styles.footerRow}>
          <Text style={styles.timestamp}>Requested on {format(item.requestDate, 'PP')}</Text>
          
          {item.status === 'PENDING' && (
              <View style={styles.actionIcons}>
                  <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
                      <Ionicons name="pencil" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="trash" size={18} color={COLORS.status.offline} />
                  </TouchableOpacity>
              </View>
          )}
      </View>
    </View>
  );

  const renderNoticeItem = ({ item }: { item: Notice }) => (
    <TouchableOpacity 
      style={styles.noticeCard}
      onPress={() => {
        setSelectedNotice(item);
        setNoticeModalVisible(true);
      }}
    >
      <View style={styles.noticeHeader}>
        <View style={styles.noticeIconContainer}>
          <Ionicons 
            name={getPriorityIcon(item.priority)} 
            size={24} 
            color={COLORS.priority[item.priority as keyof typeof COLORS.priority] || COLORS.priority.normal} 
          />
        </View>
        <View style={styles.noticeContent}>
          <Text style={styles.noticeTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.noticeDate}>{format(item.createdAt, 'PPp')}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: COLORS.priority[item.priority as keyof typeof COLORS.priority] || COLORS.priority.normal }]}>
          <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
        </View>
      </View>
      {item.message && (
        <Text style={styles.noticePreview} numberOfLines={2}>{item.message}</Text>
      )}
      {item.appUrl && (
        <View style={styles.appUpdateBadge}>
          <Ionicons name="logo-google-playstore" size={14} color="#10B981" />
          <Text style={styles.appUpdateText}>App Update Available</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ alignItems: 'center', backgroundColor: COLORS.background }}>
        {showAd && (
          <BannerAd
            unitId={effectiveBannerId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
          />
        )}
      </View>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'leaves' && styles.activeTab]}
          onPress={() => setActiveTab('leaves')}
        >
          <Ionicons 
            name="calendar" 
            size={20} 
            color={activeTab === 'leaves' ? COLORS.primary : COLORS.text.secondary} 
          />
          <Text style={[styles.tabText, activeTab === 'leaves' && styles.activeTabText]}>
            My Leaves
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'notices' && styles.activeTab]}
          onPress={() => setActiveTab('notices')}
        >
          <Ionicons 
            name="megaphone" 
            size={20} 
            color={activeTab === 'notices' ? COLORS.primary : COLORS.text.secondary} 
          />
          <Text style={[styles.tabText, activeTab === 'notices' && styles.activeTabText]}>
            Notice Board
          </Text>
          {notices.length > 0 && (
            <View style={styles.noticeBadge}>
              <Text style={styles.noticeBadgeText}>{notices.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'leaves' ? (
        <>
          {loadingLeaves ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={leaves}
              renderItem={renderLeaveItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>No leave requests found.</Text>}
            />
          )}

          <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={30} color={COLORS.white} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          {loadingNotices ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={notices}
              renderItem={renderNoticeItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>No active notices.</Text>}
            />
          )}
        </>
      )}

      {/* Leave Request Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingLeaveId ? 'Edit Leave Request' : 'Request Leave'}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close-circle" size={28} color={COLORS.text.light} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              
              {/* Date Selection Row */}
              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.label}>Start Date</Text>
                  <TouchableOpacity 
                    style={styles.dateButton} 
                    onPress={() => setOpenStart(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.dateButtonText}>
                      {format(startDate, 'MMM dd, yyyy')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateCol}>
                  <Text style={styles.label}>End Date</Text>
                  <TouchableOpacity 
                    style={styles.dateButton} 
                    onPress={() => setOpenEnd(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.dateButtonText}>
                      {format(endDate, 'MMM dd, yyyy')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <DatePicker
                modal
                open={openStart}
                date={startDate}
                mode="date"
                onConfirm={(date) => {
                  setOpenStart(false)
                  setStartDate(date)
                }}
                onCancel={() => setOpenStart(false)}
              />
              <DatePicker
                modal
                open={openEnd}
                date={endDate}
                mode="date"
                onConfirm={(date) => {
                  setOpenEnd(false)
                  setEndDate(date)
                }}
                onCancel={() => setOpenEnd(false)}
              />

              <Text style={styles.label}>Reason for Leave</Text>
              <TextInput 
                style={styles.textArea} 
                placeholder="Please describe why you need leave..." 
                placeholderTextColor={COLORS.text.light}
                value={reason} 
                onChangeText={setReason} 
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.secondaryBtn} 
                  onPress={closeModal}
                >
                   <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.primaryBtn} 
                  onPress={handleRequest} 
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Submit Request</Text>
                      <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notice Detail Modal */}
      <Modal visible={noticeModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.noticeModalHeader}>
              <Ionicons 
                name={selectedNotice ? getPriorityIcon(selectedNotice.priority) : 'information-circle'} 
                size={32} 
                color={selectedNotice ? (COLORS.priority[selectedNotice.priority as keyof typeof COLORS.priority] || COLORS.priority.normal) : COLORS.primary} 
              />
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setNoticeModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.noticeModalTitle}>{selectedNotice?.title}</Text>
            
            <View style={styles.noticeModalMeta}>
              <View style={[styles.priorityBadge, { backgroundColor: selectedNotice ? (COLORS.priority[selectedNotice.priority as keyof typeof COLORS.priority] || COLORS.priority.normal) : COLORS.primary }]}>
                <Text style={styles.priorityText}>{selectedNotice?.priority.toUpperCase()}</Text>
              </View>
              <Text style={styles.noticeModalDate}>
                {selectedNotice && format(selectedNotice.createdAt, 'PPp')}
              </Text>
            </View>

            <ScrollView style={styles.noticeModalBody}>
              <Text style={styles.noticeModalMessage}>{selectedNotice?.message}</Text>
            </ScrollView>

            {selectedNotice?.appUrl && (
              <TouchableOpacity 
                style={styles.appStoreButton}
                onPress={() => handleOpenAppUrl(selectedNotice.appUrl!)}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-google-playstore" size={20} color={COLORS.white} />
                <Text style={styles.appStoreButtonText}>Open in Play Store</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.button}
              onPress={() => setNoticeModalVisible(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  noticeBadge: {
    backgroundColor: COLORS.status.offline, // Red for alerts
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  noticeBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },

  // List
  list: { padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.text.secondary, fontSize: 16 },

  // Leave Card
  card: { 
    backgroundColor: COLORS.white, 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 15, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { fontSize: 16, fontWeight: 'bold', color: COLORS.text.primary, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  reason: { fontSize: 14, color: COLORS.text.secondary, marginBottom: 8, lineHeight: 20 },
  timestamp: { fontSize: 12, color: COLORS.text.light },

  // Notice Card
  noticeCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noticeIconContainer: {
    marginRight: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  noticeDate: {
    fontSize: 12,
    color: COLORS.text.light,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  priorityText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  noticePreview: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginTop: 4,
  },
  appUpdateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  appUpdateText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // Modal Redesign
  modalContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: COLORS.white, 
    borderRadius: 24, 
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: COLORS.text.primary,
  },
  formScroll: {
    paddingBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  dateCol: {
    flex: 1,
  },
  label: { 
    fontSize: 14, 
    color: COLORS.text.secondary, 
    marginBottom: 8,
    fontWeight: '600',
    marginLeft: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F9FAFB',
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    fontSize: 16,
    color: COLORS.text.primary,
    minHeight: 120,
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  primaryBtn: {
    flex: 1.5, // Make primary button larger
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  // Legacy styles for Notice Modal
  button: { 
    backgroundColor: COLORS.primary, 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center',
    width: '100%',
  },
  buttonText: { 
    color: COLORS.white, 
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Notice Modal
  noticeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  noticeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 12,
    lineHeight: 28,
  },
  noticeModalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  noticeModalDate: {
    fontSize: 13,
    color: COLORS.text.light,
  },
  noticeModalBody: {
    maxHeight: 300,
    marginBottom: 16,
  },
  noticeModalMessage: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  appStoreButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  appStoreButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E0F2FE', // Light blue for edit
  },
});
