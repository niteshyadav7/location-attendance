import { useEffect, useCallback } from 'react';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { useAds, InterstitialTriggers } from './useAds';

export const useSmartInterstitial = () => {
  const { effectiveInterstitialId, shouldShowInterstitial } = useAds();
  const { isLoaded, isClosed, load, show } = useInterstitialAd(effectiveInterstitialId, {
    requestNonPersonalizedAdsOnly: true,
  });

  // Reload when closed to be ready for next time
  useEffect(() => {
    if (isClosed) {
      load();
    }
  }, [isClosed, load]);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  const showAdIfEnabled = useCallback((trigger: keyof InterstitialTriggers) => {
    if (shouldShowInterstitial(trigger) && isLoaded) {
      try {
          show();
      } catch (e) {
          console.log('Failed to show interstitial', e);
      }
    }
  }, [shouldShowInterstitial, isLoaded, show]);

  return { showAdIfEnabled, isLoaded };
};
