import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMoneyRequests } from '../hooks/useMoneyRequests';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MoneyRequest } from '../types';

export const MoneyManagementScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const targetUserId = route.params?.targetUserId;

    const { 
        requests, 
        pendingRequests, 
        historyRequests, 
        loading, 
        requestMoney, 
        updateStatus, 
        deleteRequest,
        getMonthlyTotal, 
        getPendingTotal,
        userRole 
    } = useMoneyRequests(targetUserId);

    const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');

    const isMainAdminView = (userRole === 'company_admin' || userRole === 'super_admin') && !targetUserId;

    const groupedData = React.useMemo(() => {
        if (!isMainAdminView) return [];
        const sourceData = activeTab === 'PENDING' ? pendingRequests : historyRequests;
        const groups: any = {};
        sourceData.forEach(r => {
            if (!groups[r.userId]) {
                groups[r.userId] = { 
                    id: r.userId,
                    userId: r.userId,
                    userName: r.userName,
                    userEmail: r.userEmail,
                    totalAmount: 0,
                    count: 0,
                    pendingCount: 0,
                    latestDate: 0,
                    type: 'USER_GROUP',
                    hasPending: false
                };
            }
            groups[r.userId].totalAmount += r.amount;
            groups[r.userId].count += 1;
            if (r.status === 'PENDING') {
                groups[r.userId].pendingCount += 1;
                groups[r.userId].hasPending = true;
            }
            groups[r.userId].latestDate = Math.max(groups[r.userId].latestDate, r.requestDate);
        });
        return Object.values(groups).sort((a: any, b: any) => b.latestDate - a.latestDate);
    }, [isMainAdminView, activeTab, pendingRequests, historyRequests]);
    
    const [modalVisible, setModalVisible] = useState(false);
    
    // Search, Filter & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [monthFilter, setMonthFilter] = useState<'all' | 'current' | 'last' | 'last3'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    
    // Form State
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthlyTotal = getMonthlyTotal(currentMonth);
    const pendingTotal = getPendingTotal();

    const handleRequest = async () => {
        if (!amount || !reason) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        setSubmitting(true);
        const success = await requestMoney(numAmount, reason);
        setSubmitting(false);
        if (success) {
            setModalVisible(false);
            setAmount('');
            setReason('');
            Alert.alert('Success', 'Request submitted successfully');
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
            { text: 'No', style: 'cancel' },
            { text: 'Yes, Cancel', style: 'destructive', onPress: () => deleteRequest(id) }
        ]);
    };

    const renderStatusBadge = (status: string) => {
        let color = COLORS.text.secondary;
        let icon = 'help-circle';
        switch (status) {
            case 'APPROVED': color = COLORS.status.present; icon = 'checkmark-circle'; break;
            case 'REJECTED': color = COLORS.status.offline; icon = 'close-circle'; break;
            case 'PENDING': color = COLORS.status.onBreak; icon = 'time'; break;
        }
        return (
            <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                <Icon name={icon} size={14} color={color} />
                <Text style={[styles.badgeText, { color }]}>{status}</Text>
            </View>
        );
    };

    const renderUserCard = ({ item }: { item: any }) => {
        const isPendingTab = activeTab === 'PENDING';
        const hasPendingRequests = item.hasPending || isPendingTab;
        
        return (
            <View style={styles.userCardWrapper}>
                {/* Pending Indicator - Left Side Outside Card */}
                {hasPendingRequests && (
                    <View style={styles.pendingIndicatorLeft}>
                        <View style={styles.pendingDot} />
                        <Text style={styles.pendingTextVertical}>PENDING</Text>
                        <Text style={styles.pendingCountVertical}>{item.pendingCount || item.count}</Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={[
                        styles.userCard,
                        hasPendingRequests && styles.userCardPending,
                        hasPendingRequests && { marginLeft: 8 }  // Add margin when pending indicator is shown
                    ]} 
                    onPress={() => navigation.navigate('UserWalletHistory', { targetUserId: item.userId })}
                    activeOpacity={0.7}
                >
                    <View style={styles.userCardContent}>
                        {/* Left Section - User Info */}
                        <View style={styles.userInfoSection}>
                            <View style={[
                                styles.userAvatar,
                                hasPendingRequests && styles.userAvatarPending
                            ]}>
                                <Text style={styles.userAvatarText}>
                                    {item.userName?.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.userDetails}>
                                <Text style={styles.userCardName} numberOfLines={1}>
                                    {item.userName}
                                </Text>
                                <Text style={styles.userCardEmail} numberOfLines={1}>
                                    {item.userEmail}
                                </Text>
                                <View style={styles.requestCountBadge}>
                                    <Icon name="document-text-outline" size={12} color={COLORS.text.secondary} />
                                    <Text style={styles.requestCountText}>
                                        {item.count} Request{item.count !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Right Section - Amount & Action */}
                        <View style={styles.amountSection}>
                            <View style={styles.amountContainer}>
                                <Text style={styles.amountLabel}>Total Amount</Text>
                                <Text style={[
                                    styles.amountValue,
                                    hasPendingRequests && styles.amountValuePending
                                ]}>
                                    ₹{item.totalAmount.toLocaleString()}
                                </Text>
                            </View>
                            <View style={styles.viewButton}>
                                <Text style={styles.viewButtonText}>View</Text>
                                <Icon name="arrow-forward" size={16} color={COLORS.primary} />
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        if (item.type === 'USER_GROUP') return renderUserCard({ item });

        return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
                    <Text style={styles.dateText}>{format(item.requestDate, 'dd MMM yyyy, h:mm a')}</Text>
                </View>
                {renderStatusBadge(item.status)}
            </View>
            
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>
            
            {(userRole !== 'user' && item.userId) ? (
                <View style={styles.userInfo}>
                    <Icon name="person-circle-outline" size={16} color={COLORS.text.secondary} />
                    <Text style={styles.userName}>{item.userName} ({item.userEmail})</Text>
                </View>
            ) : null}

            {/* Admin Actions */}
            {item.status === 'PENDING' && userRole !== 'user' && (
                <View style={styles.adminActions}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => Alert.alert('Confirm', 'Reject this request?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Reject', onPress: () => updateStatus(item.id, 'REJECTED'), style: 'destructive' }
                        ])}
                    >
                        <Text style={[styles.actionBtnText, { color: COLORS.status.offline }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }]}
                        onPress={() => Alert.alert('Confirm', 'Approve this request?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Approve', onPress: () => updateStatus(item.id, 'APPROVED') }
                        ])}
                    >
                        <Text style={[styles.actionBtnText, { color: COLORS.status.present }]}>Approve</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* User Cancel Action */}
            {item.status === 'PENDING' && userRole === 'user' && (
                <TouchableOpacity 
                    style={styles.cancelRequestBtn} 
                    onPress={() => handleDelete(item.id)}
                >
                    <Icon name="trash-outline" size={16} color={COLORS.status.offline} />
                    <Text style={styles.cancelRequestText}>Cancel Request</Text>
                </TouchableOpacity>
            )}
        </View>
        );
    };

    const isAdmin = userRole !== 'user';
    
    // Filter & Sort Logic
    const filteredAndSortedData = useMemo(() => {
        let data: any[] = isMainAdminView 
            ? groupedData 
            : (isAdmin 
                ? (targetUserId 
                    ? requests  // Show ALL requests for specific user (no tab filtering)
                    : (activeTab === 'PENDING' ? pendingRequests : historyRequests))  // Main view uses tabs
                : requests);  // Regular user sees all their requests
        
        // Apply Month Filter (only for requests, not user cards)
        if (!isMainAdminView && monthFilter !== 'all') {
            const now = new Date();
            let startDate: Date, endDate: Date;
            
            switch (monthFilter) {
                case 'current':
                    startDate = startOfMonth(now);
                    endDate = endOfMonth(now);
                    break;
                case 'last':
                    startDate = startOfMonth(subMonths(now, 1));
                    endDate = endOfMonth(subMonths(now, 1));
                    break;
                case 'last3':
                    startDate = startOfMonth(subMonths(now, 2));
                    endDate = endOfMonth(now);
                    break;
                default:
                    startDate = new Date(0);
                    endDate = now;
            }
            
            data = data.filter((item: any) => 
                isWithinInterval(new Date(item.requestDate), { start: startDate, end: endDate })
            );
        }
        
        // Apply Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            data = data.filter((item: any) => {
                if (isMainAdminView) {
                    // Search user cards by name or email
                    return item.userName?.toLowerCase().includes(query) || 
                           item.userEmail?.toLowerCase().includes(query);
                } else {
                    // Search requests by reason, amount, or user name
                    return item.reason?.toLowerCase().includes(query) ||
                           item.amount?.toString().includes(query) ||
                           item.userName?.toLowerCase().includes(query) ||
                           item.userEmail?.toLowerCase().includes(query);
                }
            });
        }
        
        // Apply Sorting
        data = [...data].sort((a: any, b: any) => {
            let comparison = 0;
            
            if (isMainAdminView) {
                // Sort user cards
                switch (sortBy) {
                    case 'amount':
                        comparison = a.totalAmount - b.totalAmount;
                        break;
                    case 'name':
                        comparison = (a.userName || '').localeCompare(b.userName || '');
                        break;
                    case 'date':
                    default:
                        comparison = a.latestDate - b.latestDate;
                }
            } else {
                // Sort requests
                switch (sortBy) {
                    case 'amount':
                        comparison = a.amount - b.amount;
                        break;
                    case 'name':
                        comparison = (a.userName || '').localeCompare(b.userName || '');
                        break;
                    case 'date':
                    default:
                        comparison = a.requestDate - b.requestDate;
                }
            }
            
            return sortOrder === 'asc' ? comparison : -comparison;
        });
        
        return data;
    }, [isMainAdminView, groupedData, isAdmin, activeTab, pendingRequests, historyRequests, requests, monthFilter, searchQuery, sortBy, sortOrder]);
    
    const listData = filteredAndSortedData;

    // Dynamic Summary Logic
    const summaryLabel = targetUserId 
        ? 'Total Requests (All Time)'  // User-specific view shows all requests
        : (isAdmin && activeTab === 'PENDING' 
            ? 'Total Pending Requests' 
            : `Total Approved (In ${format(new Date(), 'MMMM')})`);
        
    const summaryValue = targetUserId
        ? requests.reduce((sum, r) => sum + r.amount, 0)  // Sum all requests for this user
        : (isAdmin && activeTab === 'PENDING'
            ? pendingTotal
            : monthlyTotal);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Wallet & Advances</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{summaryLabel}</Text>
                <Text style={styles.summaryValue}>₹{summaryValue.toLocaleString()}</Text>
            </View>

            {/* Admin Tabs - Only show in main view, not when viewing specific user */}
            {isAdmin && !targetUserId && (
                <View style={styles.tabs}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'PENDING' && styles.activeTab]} 
                        onPress={() => setActiveTab('PENDING')}
                    >
                        <Text style={[styles.tabText, activeTab === 'PENDING' && styles.activeTabText]}>
                            Pending ({pendingRequests.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'HISTORY' && styles.activeTab]} 
                        onPress={() => setActiveTab('HISTORY')}
                    >
                        <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.activeTabText]}>History</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Icon name="search" size={20} color={COLORS.text.secondary} style={{marginRight: 8}} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={isMainAdminView ? "Search users by name or email..." : "Search requests by reason, amount..."}
                    placeholderTextColor={COLORS.text.light}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="close-circle" size={20} color={COLORS.text.secondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter & Sort Controls */}
            <View style={styles.controlsRow}>
                {/* Month Filter (only for detail view) */}
                {!isMainAdminView && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flex: 1}}>
                        <View style={{flexDirection: 'row', gap: 8, paddingHorizontal: 16}}>
                            {[
                                { value: 'all', label: 'All Time' },
                                { value: 'current', label: 'This Month' },
                                { value: 'last', label: 'Last Month' },
                                { value: 'last3', label: 'Last 3 Months' }
                            ].map(filter => (
                                <TouchableOpacity
                                    key={filter.value}
                                    style={[styles.filterChip, monthFilter === filter.value && styles.activeFilterChip]}
                                    onPress={() => setMonthFilter(filter.value as any)}
                                >
                                    <Text style={[styles.filterChipText, monthFilter === filter.value && styles.activeFilterChipText]}>
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                )}
                
                {/* Sort Controls */}
                <View style={styles.sortContainer}>
                    <TouchableOpacity 
                        style={styles.sortButton}
                        onPress={() => {
                            if (sortBy === 'date') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                                setSortBy('date');
                                setSortOrder('desc');
                            }
                        }}
                    >
                        <Icon name="calendar-outline" size={16} color={sortBy === 'date' ? COLORS.primary : COLORS.text.secondary} />
                        {sortBy === 'date' && (
                            <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} color={COLORS.primary} />
                        )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.sortButton}
                        onPress={() => {
                            if (sortBy === 'amount') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                                setSortBy('amount');
                                setSortOrder('desc');
                            }
                        }}
                    >
                        <Icon name="cash-outline" size={16} color={sortBy === 'amount' ? COLORS.primary : COLORS.text.secondary} />
                        {sortBy === 'amount' && (
                            <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} color={COLORS.primary} />
                        )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.sortButton}
                        onPress={() => {
                            if (sortBy === 'name') {
                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                                setSortBy('name');
                                setSortOrder('asc');
                            }
                        }}
                    >
                        <Icon name="person-outline" size={16} color={sortBy === 'name' ? COLORS.primary : COLORS.text.secondary} />
                        {sortBy === 'name' && (
                            <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} color={COLORS.primary} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Results Count */}
            <View style={{paddingHorizontal: 16, paddingVertical: 8}}>
                <Text style={{fontSize: 12, color: COLORS.text.secondary}}>
                    {listData.length} {isMainAdminView ? 'user' : 'request'}{listData.length !== 1 ? 's' : ''} found
                </Text>
            </View>


            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={listData}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon name="wallet-outline" size={64} color="#E5E7EB" />
                            <Text style={styles.emptyText}>No requests found.</Text>
                        </View>
                    }
                />
            )}

            {/* FAB for New Request (User Only) */}
            {!isAdmin && (
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <Icon name="add" size={30} color="#fff" />
                </TouchableOpacity>
            )}

            {/* Request Modal */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Advance</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Icon name="close" size={24} color={COLORS.text.primary} />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.inputLabel}>Amount (₹)</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. 5000" 
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        <Text style={styles.inputLabel}>Reason</Text>
                        <TextInput 
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                            placeholder="Why do you need this?" 
                            multiline
                            value={reason}
                            onChangeText={setReason}
                        />

                        <TouchableOpacity 
                            style={styles.submitBtn} 
                            onPress={handleRequest}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>Submit Request</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        elevation: 2,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary },
    summaryCard: {
        margin: 16,
        padding: 20,
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        elevation: 4,
    },
    summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4 },
    summaryValue: { color: COLORS.white, fontSize: 32, fontWeight: 'bold' },
    tabs: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: COLORS.white, elevation: 2 },
    tabText: { fontWeight: '600', color: COLORS.text.secondary },
    activeTabText: { color: COLORS.primary },
    list: { padding: 16, paddingBottom: 100 },
    card: {
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    amountText: { fontSize: 18, fontWeight: 'bold', color: COLORS.text.primary },
    dateText: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    reasonLabel: { fontSize: 12, color: COLORS.text.secondary, fontWeight: '600' },
    reasonText: { fontSize: 14, color: COLORS.text.primary, marginTop: 2, lineHeight: 20 },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    userName: { fontSize: 12, color: COLORS.text.secondary },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 16, color: COLORS.text.secondary, fontSize: 16 },
    fab: {
        position: 'absolute', right: 20, bottom: 20,
        backgroundColor: COLORS.primary,
        width: 56, height: 56, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center',
        elevation: 6,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text.primary },
    inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary, marginBottom: 8 },
    input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB', color: COLORS.text.primary },
    submitBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
    submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
    adminActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    actionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
    actionBtnText: { fontWeight: 'bold', fontSize: 14 },
    cancelRequestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        gap: 8,
    },
    cancelRequestText: {
        color: COLORS.status.offline,
        fontWeight: '600',
        fontSize: 14,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.text.primary,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeFilterChip: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterChipText: {
        fontSize: 12,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },
    activeFilterChipText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    sortContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    // Professional User Card Styles
    userCardWrapper: {
        flexDirection: 'row',
        alignItems: 'stretch',
        marginBottom: 12,
    },
    userCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    userCardPending: {
        borderColor: '#FCD34D',
        borderWidth: 2,
        backgroundColor: '#FFFBEB',
        elevation: 4,
    },
    pendingIndicatorLeft: {
        width: 50,
        backgroundColor: '#F59E0B',
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        marginLeft: 16,
        paddingVertical: 12,
        paddingHorizontal: 6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        elevation: 4,
        shadowColor: '#F59E0B',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    pendingTextVertical: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.white,
        textTransform: 'uppercase',
        letterSpacing: 1,
        writingDirection: 'ltr',
        textAlign: 'center',
    },
    pendingCountVertical: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.white,
        marginTop: 4,
    },
    pendingIndicator: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    pendingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F59E0B',
    },
    pendingText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#D97706',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    userCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    userInfoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    userAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#E0E7FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#C7D2FE',
    },
    userAvatarPending: {
        backgroundColor: '#FEF3C7',
        borderColor: '#FCD34D',
    },
    userAvatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    userDetails: {
        flex: 1,
        gap: 4,
    },
    userCardName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text.primary,
        marginBottom: 2,
    },
    userCardEmail: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginBottom: 4,
    },
    requestCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
    },
    requestCountText: {
        fontSize: 11,
        color: COLORS.text.secondary,
        fontWeight: '500',
    },
    amountSection: {
        alignItems: 'flex-end',
        gap: 8,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amountLabel: {
        fontSize: 10,
        color: COLORS.text.secondary,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    amountValue: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text.primary,
    },
    amountValuePending: {
        color: '#D97706',
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    viewButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
});
