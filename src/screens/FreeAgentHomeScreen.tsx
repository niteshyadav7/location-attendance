import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useJoinOrganization } from '../hooks/useJoinOrganization';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../constants/theme';

export const FreeAgentHomeScreen = () => {
    const user = useAuthStore(state => state.user);
    const {
        organizations,
        pendingRequests,
        vacancies,
        loading,
        searchOrganizations,
        requestToJoin,
        joinWithCode
    } = useJoinOrganization();

    const [activeTab, setActiveTab] = useState<'jobs' | 'search' | 'code'>('jobs');
    const [searchQuery, setSearchQuery] = useState('');
    const [orgCode, setOrgCode] = useState('');
    const [requestingOrgId, setRequestingOrgId] = useState<string | null>(null);
    const [joiningCode, setJoiningCode] = useState(false);

    const handleSearch = () => {
        searchOrganizations(searchQuery);
    };

    const handleJoinRequest = async (orgId: string, orgName: string) => {
        setRequestingOrgId(orgId);
        try {
            await requestToJoin(orgId, orgName);
            Alert.alert('Success', `Join request submitted to ${orgName}. Wait for admin approval.`);
        } catch (error: any) {
            Alert.alert('Request Failed', error.message || 'Could not send join request.');
        } finally {
            setRequestingOrgId(null);
        }
    };

    const handleJoinWithCode = async () => {
        if (!orgCode.trim()) {
            Alert.alert('Error', 'Please enter a valid organization code.');
            return;
        }
        setJoiningCode(true);
        try {
            await joinWithCode(orgCode);
            Alert.alert('Success', 'Join request submitted successfully. Wait for admin approval.');
            setOrgCode('');
        } catch (error: any) {
            Alert.alert('Failed', error.message || 'Could not join organization.');
        } finally {
            setJoiningCode(false);
        }
    };

    const renderVacancyItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.badgeContainer}>
                    <Icon name="briefcase" size={16} color={COLORS.primary} />
                    <Text style={styles.badgeText}>{item.jobCategory}</Text>
                </View>
                {item.payout ? (
                    <Text style={styles.payoutText}>💰 {item.payout}</Text>
                ) : null}
            </View>
            <Text style={styles.vacancyCompany}>🏢 {item.employerName}</Text>
            <Text style={styles.vacancyLocality}>📍 {item.locality}</Text>
            <Text style={styles.vacancyDesc}>{item.description}</Text>
            <TouchableOpacity 
                style={styles.contactBtn}
                onPress={() => Alert.alert('Contact Details', `Contact employer at: ${item.employerPhone}`)}
            >
                <Text style={styles.contactBtnText}>View Details & Contact</Text>
            </TouchableOpacity>
        </View>
    );

    const renderOrgItem = ({ item }: { item: any }) => {
        const isPending = pendingRequests.some(r => r.organizationId === item.id && r.status === 'PENDING');
        const isRejected = pendingRequests.some(r => r.organizationId === item.id && r.status === 'REJECTED');
        
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.companyName}>🏢 {item.name}</Text>
                    {isPending && <Text style={[styles.statusBadge, styles.pending]}>Pending</Text>}
                    {isRejected && <Text style={[styles.statusBadge, styles.rejected]}>Rejected</Text>}
                </View>
                <Text style={styles.companyAddress}>📍 {item.address || 'No address details provided'}</Text>
                <Text style={styles.companyEmail}>✉️ {item.email}</Text>
                
                {!isPending && !isRejected && (
                    <TouchableOpacity
                        style={styles.requestBtn}
                        disabled={requestingOrgId === item.id}
                        onPress={() => handleJoinRequest(item.id, item.name)}
                    >
                        {requestingOrgId === item.id ? (
                            <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                            <Text style={styles.requestBtnText}>Request to Join</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <LinearGradient colors={COLORS.gradients.primary} style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.welcomeText}>Welcome, {user?.name}</Text>
                    <Text style={styles.subTitleText}>Explore opportunities & join organizations</Text>
                </View>
            </LinearGradient>

            {/* Navigation Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'jobs' && styles.activeTabItem]}
                    onPress={() => setActiveTab('jobs')}
                >
                    <Icon name="newspaper-outline" size={20} color={activeTab === 'jobs' ? COLORS.primary : COLORS.text.secondary} />
                    <Text style={[styles.tabLabel, activeTab === 'jobs' && styles.activeTabLabel]}>Jobs</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'search' && styles.activeTabItem]}
                    onPress={() => {
                        setActiveTab('search');
                        if (organizations.length === 0) handleSearch();
                    }}
                >
                    <Icon name="search-outline" size={20} color={activeTab === 'search' ? COLORS.primary : COLORS.text.secondary} />
                    <Text style={[styles.tabLabel, activeTab === 'search' && styles.activeTabLabel]}>Search Org</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'code' && styles.activeTabItem]}
                    onPress={() => setActiveTab('code')}
                >
                    <Icon name="key-outline" size={20} color={activeTab === 'code' ? COLORS.primary : COLORS.text.secondary} />
                    <Text style={[styles.tabLabel, activeTab === 'code' && styles.activeTabLabel]}>Org Code</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>
                {activeTab === 'jobs' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>📢 Job Broadcasts</Text>
                        {vacancies.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Icon name="notifications-off-outline" size={48} color={COLORS.text.light} />
                                <Text style={styles.emptyText}>No active job broadcasts</Text>
                                <Text style={styles.emptySubtext}>Check back later or search for organizations directly.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={vacancies}
                                renderItem={renderVacancyItem}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listPadding}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                )}

                {activeTab === 'search' && (
                    <View style={styles.tabContent}>
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by organization name..."
                                placeholderTextColor={COLORS.text.light}
                                value={searchQuery}
                                onChangeText={(text) => {
                                    setSearchQuery(text);
                                    searchOrganizations(text);
                                }}
                                onSubmitEditing={handleSearch}
                            />
                            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                                <Icon name="search" size={20} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
                        ) : organizations.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Icon name="business-outline" size={48} color={COLORS.text.light} />
                                <Text style={styles.emptyText}>No organizations found</Text>
                                <Text style={styles.emptySubtext}>Try a different search query or use a code.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={organizations}
                                renderItem={renderOrgItem}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listPadding}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                )}

                {activeTab === 'code' && (
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.codeCard}>
                            <Icon name="key" size={40} color={COLORS.primary} style={styles.codeIcon} />
                            <Text style={styles.codeTitle}>Join with Code</Text>
                            <Text style={styles.codeSubtitle}>Enter the 6-digit organization code provided by your administrator.</Text>
                            
                            <TextInput
                                style={styles.codeInput}
                                placeholder="E.G. A1B2C3"
                                placeholderTextColor={COLORS.text.light}
                                autoCapitalize="characters"
                                maxLength={6}
                                value={orgCode}
                                onChangeText={setOrgCode}
                            />

                            <TouchableOpacity 
                                style={styles.submitCodeBtn} 
                                onPress={handleJoinWithCode}
                                disabled={joiningCode}
                            >
                                {joiningCode ? (
                                    <ActivityIndicator color={COLORS.white} size="small" />
                                ) : (
                                    <Text style={styles.submitCodeBtnText}>Submit Code</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* User requests history */}
                        {pendingRequests.length > 0 && (
                            <View style={styles.requestsSection}>
                                <Text style={styles.sectionTitle}>Your Join Requests</Text>
                                {pendingRequests.map((req) => (
                                    <View key={req.id} style={styles.requestItem}>
                                        <View style={styles.requestInfo}>
                                            <Text style={styles.requestOrgName}>🏢 {req.organizationName}</Text>
                                            <Text style={styles.requestDate}>Requested on: {new Date(req.requestDate).toLocaleDateString()}</Text>
                                        </View>
                                        <Text style={[
                                            styles.statusBadgeText,
                                            req.status === 'PENDING' ? styles.pendingText :
                                            req.status === 'APPROVED' ? styles.approvedText : styles.rejectedText
                                        ]}>
                                            {req.status}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerContent: {
        justifyContent: 'center',
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    subTitleText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    activeTabItem: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text.secondary,
        marginLeft: 6,
    },
    activeTabLabel: {
        color: COLORS.primary,
    },
    contentContainer: {
        flex: 1,
        marginTop: 8,
    },
    tabContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text.primary,
        marginVertical: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text.primary,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: COLORS.text.secondary,
        textAlign: 'center',
        marginTop: 6,
        paddingHorizontal: 32,
    },
    listPadding: {
        paddingBottom: 24,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(102, 126, 234, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    payoutText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.status.working,
    },
    vacancyCompany: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    vacancyLocality: {
        fontSize: 12,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    vacancyDesc: {
        fontSize: 13,
        color: COLORS.text.secondary,
        marginVertical: 10,
        lineHeight: 18,
    },
    contactBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    contactBtnText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: 'bold',
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    companyAddress: {
        fontSize: 13,
        color: COLORS.text.secondary,
        marginVertical: 4,
    },
    companyEmail: {
        fontSize: 12,
        color: COLORS.text.light,
    },
    requestBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
    },
    requestBtnText: {
        color: COLORS.white,
        fontSize: 13,
        fontWeight: 'bold',
    },
    statusBadge: {
        fontSize: 11,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    pending: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        color: '#d97706',
    },
    rejected: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: '#dc2626',
    },
    searchContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 4,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    searchInput: {
        flex: 1,
        paddingHorizontal: 12,
        fontSize: 14,
        color: COLORS.text.primary,
    },
    searchBtn: {
        backgroundColor: COLORS.primary,
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loader: {
        marginTop: 40,
    },
    codeCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        marginTop: 16,
    },
    codeIcon: {
        marginBottom: 12,
    },
    codeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text.primary,
        marginBottom: 4,
    },
    codeSubtitle: {
        fontSize: 13,
        color: COLORS.text.secondary,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
        paddingHorizontal: 8,
    },
    codeInput: {
        width: '100%',
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: COLORS.text.primary,
        letterSpacing: 4,
        marginBottom: 20,
    },
    submitCodeBtn: {
        width: '100%',
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitCodeBtnText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: 'bold',
    },
    requestsSection: {
        marginTop: 24,
    },
    requestItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    requestInfo: {
        flex: 1,
    },
    requestOrgName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text.primary,
    },
    requestDate: {
        fontSize: 11,
        color: COLORS.text.secondary,
        marginTop: 2,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    pendingText: {
        color: '#d97706',
    },
    approvedText: {
        color: '#16a34a',
    },
    rejectedText: {
        color: '#dc2626',
    },
});
