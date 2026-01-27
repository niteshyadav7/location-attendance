import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAds, ScreenAdSettings, InterstitialTriggers, AdFormat, ScreenName, AllScreensConfig, PerScreenConfig } from '../hooks/useAds';

interface AdSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AdSettingsModal = ({ visible, onClose }: AdSettingsModalProps) => {
  const { 
    bannerAdUnitId, 
    interstitialAdUnitId,
    appOpenAdUnitId,
    nativeAdUnitId,
    rewardedAdUnitId,
    showAdsGlobal, 
    enableBanner,
    enableInterstitial,
    enableNative,
    enableRewarded,
    enableAppOpen,
    screens,
    interstitialTriggers,
    updateAdConfig, 
    loading 
  } = useAds();

  const [localBannerId, setLocalBannerId] = useState('');
  const [localInterstitialId, setLocalInterstitialId] = useState('');
  const [localNativeId, setLocalNativeId] = useState('');
  const [localRewardedId, setLocalRewardedId] = useState('');
  const [localAppOpenId, setLocalAppOpenId] = useState('');
  
  const [localShowAdsGlobal, setLocalShowAdsGlobal] = useState(true);
  
  const [localEnableBanner, setLocalEnableBanner] = useState(true);
  const [localEnableInterstitial, setLocalEnableInterstitial] = useState(true);
  const [localEnableNative, setLocalEnableNative] = useState(true);
  const [localEnableRewarded, setLocalEnableRewarded] = useState(true);
  const [localEnableAppOpen, setLocalEnableAppOpen] = useState(true);

  // Deep copy of screens config to avoid mutation references
  const [localScreens, setLocalScreens] = useState<AllScreensConfig>({} as AllScreensConfig);

  const [localInterstitialTriggers, setLocalInterstitialTriggers] = useState<InterstitialTriggers>({
    onCheckIn: true,
    onCheckOut: true,
    navHistory: true,
    navLeaves: true,
    navAdminDashboard: true,
  });
  
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (visible && !loading) {
      setLocalBannerId(bannerAdUnitId);
      setLocalInterstitialId(interstitialAdUnitId);
      setLocalNativeId(nativeAdUnitId);
      setLocalRewardedId(rewardedAdUnitId);
      setLocalAppOpenId(appOpenAdUnitId);
      
      setLocalShowAdsGlobal(showAdsGlobal);
      setLocalEnableBanner(enableBanner);
      setLocalEnableInterstitial(enableInterstitial);
      setLocalEnableNative(enableNative);
      setLocalEnableRewarded(enableRewarded);
      setLocalEnableAppOpen(enableAppOpen);

      if (screens) {
          // Deep clone
          setLocalScreens(JSON.parse(JSON.stringify(screens)));
      }
      if (interstitialTriggers) setLocalInterstitialTriggers(interstitialTriggers);
    }
  }, [visible, loading, bannerAdUnitId, interstitialAdUnitId, nativeAdUnitId, rewardedAdUnitId, appOpenAdUnitId, showAdsGlobal, enableBanner, enableInterstitial, enableNative, enableRewarded, enableAppOpen, screens, interstitialTriggers]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdConfig({
        bannerAdUnitId: localBannerId,
        interstitialAdUnitId: localInterstitialId,
        nativeAdUnitId: localNativeId,
        rewardedAdUnitId: localRewardedId,
        appOpenAdUnitId: localAppOpenId,
        
        showAdsGlobal: localShowAdsGlobal,
        enableBanner: localEnableBanner,
        enableInterstitial: localEnableInterstitial,
        enableNative: localEnableNative,
        enableRewarded: localEnableRewarded,
        enableAppOpen: localEnableAppOpen,
        
        screens: localScreens,
        interstitialTriggers: localInterstitialTriggers,
      });
      Alert.alert('Success', 'Ad settings updated successfully');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleScreenFormat = (screen: ScreenName, format: AdFormat) => {
    setLocalScreens(prev => ({
      ...prev,
      [screen]: {
        ...prev[screen],
        [format]: !prev[screen][format]
      }
    }));
  };

  const toggleGlobalFormat = (format: AdFormat | 'appOpen') => {
      switch(format) {
          case 'banner': setLocalEnableBanner(!localEnableBanner); break;
          case 'interstitial': setLocalEnableInterstitial(!localEnableInterstitial); break;
          case 'native': setLocalEnableNative(!localEnableNative); break;
          case 'rewarded': setLocalEnableRewarded(!localEnableRewarded); break;
          case 'appOpen': setLocalEnableAppOpen(!localEnableAppOpen); break;
      }
  };

  const toggleInterstitialTrigger = (key: keyof InterstitialTriggers) => {
    setLocalInterstitialTriggers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getScreenLabel = (key: string) => {
    switch (key) {
      case 'home': return 'User Home Screen';
      case 'history': return 'Attendance History';
      case 'leaves': return 'Leaves & Notices';
      case 'settings': return 'Settings & Profile';
      case 'login': return 'Login Screen';
      case 'adminDashboard': return 'Admin Dashboard';
      case 'userDetails': return 'User Details';
      case 'adminLocations': return 'Manage Locations';
      case 'adminUsers': return 'Manage Users';
      case 'adminNotifications': return 'Notifications';
      case 'adminNotices': return 'Manage Notices';
      case 'adminLeaves': return 'Manage Leaves';
      case 'adminProfile': return 'Admin Profile';
      case 'addLocation': return 'Add Location';
      case 'editLocation': return 'Edit Location';
      case 'superAdminDashboard': return 'Super Admin Dashboard';
      default: return key;
    }
  };

  const getTriggerLabel = (key: string) => {
    switch (key) {
      case 'onCheckIn': return 'After Check In';
      case 'onCheckOut': return 'After Check Out';
      case 'navHistory': return 'Open History';
      case 'navLeaves': return 'Open Leaves';
      case 'navAdminDashboard': return 'Open Dashboard';
      default: return key;
    }
  };

  const { width } = Dimensions.get('window');

  const renderScreenControls = (screenKey: ScreenName) => {
    const config = localScreens[screenKey];
    if (!config) return null;

    return (
        <View style={styles.screenControlCard}>
            <View style={styles.screenHeader}>
                <Text style={styles.screenTitle}>{getScreenLabel(screenKey)}</Text>
            </View>
            <View style={styles.formatGrid}>
                <View style={styles.formatItem}>
                    <Text style={styles.formatLabel}>Banner</Text>
                    <Switch
                        value={config.banner}
                        onValueChange={() => toggleScreenFormat(screenKey, 'banner')}
                        trackColor={{ false: '#767577', true: COLORS.primary }}
                        disabled={!localShowAdsGlobal || !localEnableBanner}
                    />
                </View>
                <View style={styles.formatItem}>
                    <Text style={styles.formatLabel}>Native</Text>
                    <Switch
                        value={config.native}
                        onValueChange={() => toggleScreenFormat(screenKey, 'native')}
                        trackColor={{ false: '#767577', true: COLORS.primary }}
                        disabled={!localShowAdsGlobal || !localEnableNative}
                    />
                </View>
                <View style={styles.formatItem}>
                    <Text style={styles.formatLabel}>Interstitial</Text>
                    <Switch
                        value={config.interstitial}
                        onValueChange={() => toggleScreenFormat(screenKey, 'interstitial')}
                        trackColor={{ false: '#767577', true: COLORS.primary }}
                        disabled={!localShowAdsGlobal || !localEnableInterstitial}
                    />
                </View>
                <View style={styles.formatItem}>
                    <Text style={styles.formatLabel}>Rewarded</Text>
                    <Switch
                        value={config.rewarded}
                        onValueChange={() => toggleScreenFormat(screenKey, 'rewarded')}
                        trackColor={{ false: '#767577', true: COLORS.primary }}
                        disabled={!localShowAdsGlobal || !localEnableRewarded}
                    />
                </View>
            </View>
        </View>
    );
  };

  const sections = [
      { title: 'Employee App', screens: ['home', 'history', 'leaves', 'settings', 'login'] as ScreenName[] },
      { title: 'Company Admin', screens: ['adminDashboard', 'userDetails', 'adminLocations', 'adminUsers', 'adminNotifications', 'adminNotices', 'adminLeaves', 'adminProfile', 'addLocation', 'editLocation'] as ScreenName[] },
      { title: 'Super Admin', screens: ['superAdminDashboard'] as ScreenName[] }
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { width: width * 0.95, maxHeight: '90%' }]}> 
          <View style={styles.header}>
            <Text style={styles.title}>All Ad Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              
              {/* Global Switches */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Global Master Switches</Text>
                
                <View style={styles.row}>
                    <Text style={styles.label}>Show Ads Anywhere</Text>
                    <Switch
                        value={localShowAdsGlobal}
                        onValueChange={setLocalShowAdsGlobal}
                        trackColor={{ false: '#767577', true: COLORS.primary }}
                    />
                </View>

                <View style={styles.divider} />
                <Text style={styles.subHeader}>Enable Formats</Text>

                <View style={styles.formatRowContainer}>
                    <View style={styles.formatToggle}>
                        <Text style={styles.smallLabel}>Banner</Text>
                        <Switch value={localEnableBanner} onValueChange={() => toggleGlobalFormat('banner')} disabled={!localShowAdsGlobal} />
                    </View>
                    <View style={styles.formatToggle}>
                        <Text style={styles.smallLabel}>Native</Text>
                        <Switch value={localEnableNative} onValueChange={() => toggleGlobalFormat('native')} disabled={!localShowAdsGlobal} />
                    </View>
                    <View style={styles.formatToggle}>
                        <Text style={styles.smallLabel}>Intrstl</Text>
                        <Switch value={localEnableInterstitial} onValueChange={() => toggleGlobalFormat('interstitial')} disabled={!localShowAdsGlobal} />
                    </View>
                    <View style={styles.formatToggle}>
                        <Text style={styles.smallLabel}>Rwrded</Text>
                        <Switch value={localEnableRewarded} onValueChange={() => toggleGlobalFormat('rewarded')} disabled={!localShowAdsGlobal} />
                    </View>
                    <View style={styles.formatToggle}>
                        <Text style={styles.smallLabel}>AppOpen</Text>
                        <Switch value={localEnableAppOpen} onValueChange={() => toggleGlobalFormat('appOpen')} disabled={!localShowAdsGlobal} />
                    </View>
                </View>
              </View>

              {/* Per Screen Config */}
              <Text style={styles.sectionHeader}>Per-Screen Configuration</Text>
              
              {sections.map((section) => (
                  <View key={section.title} style={styles.sectionContainer}>
                      <TouchableOpacity 
                        style={styles.sectionTitleRow} 
                        onPress={() => setExpandedSection(expandedSection === section.title ? null : section.title)}
                      >
                          <Text style={styles.sectionTitle}>{section.title}</Text>
                          <Text style={styles.chevron}>{expandedSection === section.title ? '▼' : '►'}</Text>
                      </TouchableOpacity>
                      
                      {expandedSection === section.title && (
                          <View style={styles.sectionContent}>
                              {section.screens.map(screenName => (
                                  <View key={screenName} style={{ marginBottom: 12 }}>
                                      {renderScreenControls(screenName)}
                                  </View>
                              ))}
                          </View>
                      )}
                  </View>
              ))}

              {/* Ad Unit IDs */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Ad Unit IDs</Text>
                <View style={styles.inputGroup}>
                    <TextInput style={styles.input} value={localBannerId} onChangeText={setLocalBannerId} placeholder="Banner ID" />
                    <TextInput style={styles.input} value={localNativeId} onChangeText={setLocalNativeId} placeholder="Native ID" />
                    <TextInput style={styles.input} value={localInterstitialId} onChangeText={setLocalInterstitialId} placeholder="Interstitial ID" />
                    <TextInput style={styles.input} value={localRewardedId} onChangeText={setLocalRewardedId} placeholder="Rewarded ID" />
                    <TextInput style={styles.input} value={localAppOpenId} onChangeText={setLocalAppOpenId} placeholder="App Open ID" />
                </View>
              </View>

              {/* Interstitial Triggers */}
              <View style={styles.card}>
                 <Text style={styles.cardTitle}>Action Triggers (Interstitial)</Text>
                 {Object.keys(localInterstitialTriggers).map((key) => (
                     <View key={key} style={styles.row}>
                         <Text style={styles.label}>{getTriggerLabel(key)}</Text>
                         <Switch
                             value={localInterstitialTriggers[key as keyof InterstitialTriggers]}
                             onValueChange={() => toggleInterstitialTrigger(key as keyof InterstitialTriggers)}
                             trackColor={{ false: '#767577', true: COLORS.primary }}
                             disabled={!localShowAdsGlobal || !localEnableInterstitial}
                         />
                     </View>
                 ))}
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Configuration</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.text.secondary,
    padding: 4,
  },
  content: {
    gap: 16,
    paddingBottom: 20,
  },
  card: {
      backgroundColor: COLORS.white,
      borderRadius: 12,
      padding: 16,
      elevation: 2,
  },
  cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      color: COLORS.text.primary
  },
  sectionHeader: {
      fontSize: 20,
      fontWeight: 'bold',
      color: COLORS.text.primary,
      marginTop: 8,
      marginLeft: 4
  },
  sectionContainer: {
      backgroundColor: COLORS.white,
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 1,
  },
  sectionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: '#fff',
      alignItems: 'center'
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.text.primary
  },
  chevron: {
      fontSize: 14,
      color: COLORS.text.secondary
  },
  sectionContent: {
      padding: 12,
      backgroundColor: '#FAFAFA',
      borderTopWidth: 1,
      borderTopColor: '#EEE'
  },
  screenControlCard: {
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: '#E5E7EB'
  },
  screenHeader: {
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
      paddingBottom: 4
  },
  screenTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: COLORS.text.primary
  },
  formatGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between'
  },
  formatItem: {
      alignItems: 'center',
      width: '24%',
  },
  formatLabel: {
      fontSize: 10,
      marginBottom: 4,
      color: COLORS.text.secondary
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  formatRowContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap'
  },
  formatToggle: {
      alignItems: 'center',
      marginBottom: 8
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  subHeader: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.text.secondary,
      marginTop: 8,
      marginBottom: 8
  },
  smallLabel: {
      fontSize: 11,
      marginBottom: 4,
      color: COLORS.text.secondary
  },
  inputGroup: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#F9FAFB',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      marginVertical: 12
  }
});

