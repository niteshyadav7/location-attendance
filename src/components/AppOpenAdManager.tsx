import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppOpenAd } from 'react-native-google-mobile-ads';
import { useAds } from '../hooks/useAds';

export const AppOpenAdManager = () => {
  const { effectiveAppOpenId, enableAppOpen, showAdsGlobal } = useAds();
  const { isLoaded, load, show } = useAppOpenAd(effectiveAppOpenId, {
    requestNonPersonalizedAdsOnly: true,
  });

  // Preload the ad
  useEffect(() => {
    if (showAdsGlobal && enableAppOpen) {
      load();
    }
  }, [load, showAdsGlobal, enableAppOpen]);

  // Listen to AppState
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        nextAppState === 'active' && 
        isLoaded && 
        showAdsGlobal && 
        enableAppOpen
      ) {
        show();
        // Reload for next time
        load(); 
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isLoaded, show, load, showAdsGlobal, enableAppOpen]);

  return null;
};
