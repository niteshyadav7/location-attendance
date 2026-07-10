import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../constants/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const ImpersonationBanner = () => {
  const insets = useSafeAreaInsets();
  const impersonatorUser = useAuthStore((state) => state.impersonatorUser);
  const organization = useAuthStore((state) => state.organization);
  const exitImpersonation = useAuthStore((state) => state.exitImpersonation);

  if (!impersonatorUser) return null;

  return (
    <View style={[styles.outerContainer, { paddingTop: Platform.OS === 'ios' ? insets.top : 8 }]}>
      <StatusBar barStyle="light-content" backgroundColor="#5a429a" />
      <View style={styles.bannerContainer}>
        <View style={styles.leftContent}>
          <View style={styles.iconWrapper}>
            <Ionicons name="eye-outline" size={18} color="#ffffff" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>🕵️ Explorer Mode</Text>
            <Text style={styles.subtitleText} numberOfLines={1}>
              Viewing {organization?.name || 'Company'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.exitButton} 
          onPress={exitImpersonation}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={14} color="#ffffff" style={styles.exitIcon} />
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#764ba2', // Match violet secondary gradient color
    borderBottomWidth: 1,
    borderBottomColor: '#5a429a',
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    gap: 12,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444', // Red exit alert button
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  exitIcon: {
    marginRight: 4,
  },
  exitButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
