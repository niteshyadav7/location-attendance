import { startTransition, useEffect, useState } from 'react';
import { getFirestore, doc, onSnapshot, setDoc } from '@react-native-firebase/firestore';
import { TestIds } from 'react-native-google-mobile-ads';

export interface ScreenAdSettings {
  // Employee Screens
  home: boolean;
  history: boolean;
  leaves: boolean;
  settings: boolean;
  userNotifications: boolean;
  
  // Auth
  login: boolean;

  // Company Admin Screens
  adminDashboard: boolean;
  userDetails: boolean;
  adminLocations: boolean;
  adminUsers: boolean;
  adminNotifications: boolean;
  adminNotices: boolean;
  adminLeaves: boolean;
  adminProfile: boolean;
  addLocation: boolean;
  editLocation: boolean;
  
  // Super Admin
  superAdminDashboard: boolean;
}

export type AdFormat = 'banner' | 'interstitial' | 'native' | 'rewarded';
export type ScreenName = keyof ScreenAdSettings;

export interface PerScreenConfig {
  banner: boolean;
  native: boolean;
  interstitial: boolean;
  rewarded: boolean;
}

export type AllScreensConfig = Record<ScreenName, PerScreenConfig>;

export interface InterstitialTriggers {
  // Actions
  onCheckIn: boolean;
  onCheckOut: boolean;
  
  // Navigation
  navHistory: boolean;
  navLeaves: boolean;
  navAdminDashboard: boolean;
}

export interface AdConfig {
  // IDs
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  nativeAdUnitId: string;
  rewardedAdUnitId: string;
  appOpenAdUnitId: string;

  // Global Master Switch
  showAdsGlobal: boolean;

  // Format Global Toggles
  enableBanner: boolean;
  enableInterstitial: boolean;
  enableNative: boolean;
  enableRewarded: boolean;
  enableAppOpen: boolean;

  // Granular Settings
  screens: AllScreensConfig;
  interstitialTriggers: InterstitialTriggers; 
  screenSettings: ScreenAdSettings; 
}

const DEFAULT_INTERSTITIAL_TRIGGERS: InterstitialTriggers = {
  onCheckIn: true,
  onCheckOut: true,
  navHistory: true,
  navLeaves: true,
  navAdminDashboard: true,
};

const DEFAULT_PER_SCREEN: PerScreenConfig = {
  banner: true,
  native: true,
  interstitial: true,
  rewarded: true,
};

const DEFAULT_SCREENS_CONFIG: AllScreensConfig = {
  home: { ...DEFAULT_PER_SCREEN },
  history: { ...DEFAULT_PER_SCREEN },
  leaves: { ...DEFAULT_PER_SCREEN },
  settings: { ...DEFAULT_PER_SCREEN },
  userNotifications: { ...DEFAULT_PER_SCREEN },
  login: { ...DEFAULT_PER_SCREEN },
  adminDashboard: { ...DEFAULT_PER_SCREEN },
  userDetails: { ...DEFAULT_PER_SCREEN },
  adminLocations: { ...DEFAULT_PER_SCREEN },
  adminUsers: { ...DEFAULT_PER_SCREEN },
  adminNotifications: { ...DEFAULT_PER_SCREEN },
  adminNotices: { ...DEFAULT_PER_SCREEN },
  adminLeaves: { ...DEFAULT_PER_SCREEN },
  adminProfile: { ...DEFAULT_PER_SCREEN },
  addLocation: { ...DEFAULT_PER_SCREEN },
  editLocation: { ...DEFAULT_PER_SCREEN },
  superAdminDashboard: { ...DEFAULT_PER_SCREEN },
};

// Legacy fallback helper
const DEFAULT_SCREEN_SETTINGS_LEGACY: ScreenAdSettings = {
  home: true, history: true, leaves: true, settings: true, login: true,
  userNotifications: true,
  adminDashboard: true, userDetails: true, adminLocations: true,
  adminUsers: true, adminNotifications: true, adminNotices: true,
  adminLeaves: true, adminProfile: true, addLocation: true,
  editLocation: true, superAdminDashboard: true,
};

export const useAds = () => {
  const [adConfig, setAdConfig] = useState<AdConfig>({
    bannerAdUnitId: 'ca-app-pub-6814953421558759/7805374728',
    interstitialAdUnitId: 'ca-app-pub-6814953421558759/YOUR_INTERSTITIAL_ID',
    nativeAdUnitId: '',
    rewardedAdUnitId: '',
    appOpenAdUnitId: 'ca-app-pub-6814953421558759/YOUR_APP_OPEN_ID',
    showAdsGlobal: true,
    enableBanner: true,
    enableInterstitial: true,
    enableNative: true,
    enableRewarded: true,
    enableAppOpen: true,
    screens: DEFAULT_SCREENS_CONFIG,
    interstitialTriggers: DEFAULT_INTERSTITIAL_TRIGGERS,
    screenSettings: DEFAULT_SCREEN_SETTINGS_LEGACY,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore();
    const adsRef = doc(db, 'admin_settings', 'ads');

    const unsubscribe = onSnapshot(adsRef, 
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setAdConfig({
            bannerAdUnitId: data?.bannerAdUnitId || '',
            interstitialAdUnitId: data?.interstitialAdUnitId || '',
            nativeAdUnitId: data?.nativeAdUnitId || '',
            rewardedAdUnitId: data?.rewardedAdUnitId || '',
            appOpenAdUnitId: data?.appOpenAdUnitId || '',
            showAdsGlobal: data?.showAdsGlobal ?? true,
            enableBanner: data?.enableBanner ?? true,
            enableInterstitial: data?.enableInterstitial ?? true,
            enableNative: data?.enableNative ?? true,
            enableRewarded: data?.enableRewarded ?? true,
            enableAppOpen: data?.enableAppOpen ?? true,
            screens: {
                ...DEFAULT_SCREENS_CONFIG,
                ...(data?.screens || {}),
            },
            interstitialTriggers: {
              ...DEFAULT_INTERSTITIAL_TRIGGERS,
              ...(data?.interstitialTriggers || {}),
            },
            // Legacy for compatibility if we remove it later
            screenSettings: { ...DEFAULT_SCREEN_SETTINGS_LEGACY, ...(data?.screenSettings || {}) }
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching ads config:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateAdConfig = async (newConfig: Partial<AdConfig>) => {
    try {
      const db = getFirestore();
      const adsRef = doc(db, 'admin_settings', 'ads');
      await setDoc(adsRef, newConfig, { merge: true });
    } catch (error) {
      console.error('Error updating ads config:', error);
      throw error;
    }
  };

  // Backwards compatible for Banner only
  const shouldShowAd = (screen: ScreenName) => {
    if (!adConfig.showAdsGlobal) return false;
    if (!adConfig.enableBanner) return false;
    // Check new granular config first
    if (adConfig.screens && adConfig.screens[screen]) {
        return adConfig.screens[screen].banner;
    }
    // Fallback
    return true;
  };

  const shouldShowFormat = (screen: ScreenName, format: AdFormat) => {
    if (!adConfig.showAdsGlobal) return false;
    
    // Check global toggles
    if (format === 'banner' && !adConfig.enableBanner) return false;
    if (format === 'interstitial' && !adConfig.enableInterstitial) return false;
    if (format === 'native' && !adConfig.enableNative) return false;
    if (format === 'rewarded' && !adConfig.enableRewarded) return false;

    // Check specific screen config
    const screenConfig = adConfig.screens[screen] || DEFAULT_PER_SCREEN;
    return screenConfig[format];
  };

  const shouldShowInterstitial = (trigger: keyof InterstitialTriggers) => {
     // Legacy support for triggered events, or map them to screens?
     // For now keep as is for specific action triggers
    if (!adConfig.showAdsGlobal) return false;
    if (!adConfig.enableInterstitial) return false;
    return adConfig.interstitialTriggers[trigger] ?? true;
  };

  // Logic to determine which ID to actually use
  const effectiveBannerId = __DEV__ 
    ? TestIds.BANNER 
    : adConfig.bannerAdUnitId;

  const effectiveInterstitialId = __DEV__ 
    ? TestIds.INTERSTITIAL 
    : adConfig.interstitialAdUnitId;

  const effectiveAppOpenId = __DEV__ 
    ? TestIds.APP_OPEN 
    : adConfig.appOpenAdUnitId;

  const effectiveNativeId = __DEV__
    ? TestIds.NATIVE
    : adConfig.nativeAdUnitId;

  const effectiveRewardedId = __DEV__
    ? TestIds.REWARDED
    : adConfig.rewardedAdUnitId;

  return {
    ...adConfig,
    effectiveBannerId,
    effectiveInterstitialId,
    effectiveAppOpenId,
    effectiveNativeId,
    effectiveRewardedId,
    updateAdConfig,
    shouldShowAd,
    shouldShowFormat,
    shouldShowInterstitial,
    loading,
  };
};
