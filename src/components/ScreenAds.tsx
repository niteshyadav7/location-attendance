import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { useAds, ScreenName } from '../hooks/useAds';
import { COLORS } from '../constants/theme';

interface ScreenAdProps {
  screen: ScreenName;
}

export const ScreenAdBanner = ({ screen }: ScreenAdProps) => {
  const { shouldShowFormat, effectiveBannerId } = useAds();
  const show = shouldShowFormat(screen, 'banner');

  if (!show) return null;

  return (
    <View style={styles.bannerContainer}>
      <BannerAd
        unitId={effectiveBannerId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
};

export const ScreenAdNative = ({ screen }: ScreenAdProps) => {
    const { shouldShowFormat, effectiveNativeId } = useAds();
    const show = shouldShowFormat(screen, 'native');

    if (!show) return null;

    // Note: True Native Advanced Ads require native layout XML/XIB changes or specific library components.
    // For this implementation, we will render a placeholder that WOULD be the native ad container.
    // In a real production app without Pre-built Native templates, this requires significant native work.
    // We will render a "Native-like" view to demonstrate placement.
    
    return (
        <View style={styles.nativeContainer}>
            <View style={styles.nativeAdBadge}>
                <Text style={styles.nativeAdBadgeText}>Ad</Text>
            </View>
            <Text style={styles.nativeTitle}>Sponsored Content</Text>
            <Text style={styles.nativeBody}>This is a native ad placeholder. Configure Native Ad Unit ID to see real ads.</Text>
        </View>
    );
};

export const useScreenInterstitial = (screen: ScreenName) => {
    const { shouldShowFormat, effectiveInterstitialId } = useAds();
    const show = shouldShowFormat(screen, 'interstitial');
    const [loaded, setLoaded] = useState(false);
    const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);

    useEffect(() => {
        if (!show) return;

        const ad = InterstitialAd.createForAdRequest(effectiveInterstitialId, {
            requestNonPersonalizedAdsOnly: true,
        });

        const unsubscribe = ad.addAdEventListener(AdEventType.LOADED, () => {
             setLoaded(true);
             ad.show(); // Show immediately on load for "Per Screen" requirement? Or wait? 
             // Usually showing strictly on screen mount is bad UX, but per user request "make for each screen".
        });

        ad.load();
        setInterstitial(ad);

        return () => {
            // cleanup if needed
             unsubscribe();
        };
    }, [screen, show, effectiveInterstitialId]);

    return { loaded };
};


// Rewarded Ad helper
import { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

export const useScreenRewarded = (screen: ScreenName) => {
    const { shouldShowFormat, effectiveRewardedId } = useAds();
    const show = shouldShowFormat(screen, 'rewarded');
    
    // This hook exposes a function to show the ad, rather than auto-showing
    const showRewarded = () => {
        if (!show) return;
        
        const ad = RewardedAd.createForAdRequest(effectiveRewardedId, {
            requestNonPersonalizedAdsOnly: true,
        });
        
        const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
            ad.show();
        });
        
        const unsubscribeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
            console.log('User earned reward of ', reward);
        });

        ad.load();
        
        return () => {
            unsubscribeLoaded();
            unsubscribeEarned();
        };
    };

    return { showRewarded, isEnabled: show };
};


const styles = StyleSheet.create({
  bannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    width: '100%',
  },
  nativeContainer: {
      backgroundColor: '#f6f6f6',
      padding: 12,
      marginVertical: 8,
      marginHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ddd'
  },
  nativeAdBadge: {
      backgroundColor: '#f0ad4e',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginBottom: 4
  },
  nativeAdBadgeText: {
      fontSize: 10,
      color: 'white',
      fontWeight: 'bold'
  },
  nativeTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333'
  },
  nativeBody: {
      fontSize: 14,
      color: '#666',
      marginTop: 4
  }
});
