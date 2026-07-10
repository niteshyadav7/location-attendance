import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { MantraScanner } = NativeModules;

// Type definitions for MantraScanner Module methods
export interface FingerprintCaptureResult {
  isoTemplate: string; // Base64 ISO Template
  ansiTemplate: string; // Base64 ANSI Template
  fingerprintImage: string; // Base64 raw image
  quality: number;
}

export interface MatchedUserResult {
  uid: string;
  name: string;
  matchScore: number;
}

export interface UserTemplateRecord {
  uid: string;
  name: string;
  fingerprintTemplate?: string;
}

interface MantraScannerInterface {
  initializeScanner(): Promise<string>;
  uninitializeScanner(): Promise<number>;
  startCapture(minQuality: number, timeoutMs: number): Promise<FingerprintCaptureResult>;
  stopCapture(): Promise<number>;
  matchFingerprints(template1Base64: string, template2Base64: string): Promise<number>;
  matchUser(currentTemplateBase64: string, userList: UserTemplateRecord[]): Promise<MatchedUserResult | null>;
}

const scannerInstance = MantraScanner as MantraScannerInterface;

// Event Emitter setup for receiving scan/device state notifications
const scannerEventEmitter = Platform.OS === 'android' ? new NativeEventEmitter(MantraScanner) : null;

export const MantraScannerService = {
  /**
   * Initializes the scanner driver. Must be called before scanning.
   */
  initializeScanner: async (): Promise<string> => {
    if (Platform.OS !== 'android') {
      throw new Error('Mantra Scanner is only supported on Android devices.');
    }
    return scannerInstance.initializeScanner();
  },

  /**
   * Uninitializes the scanner driver. Call when closing/leaving kiosk screens.
   */
  uninitializeScanner: async (): Promise<number> => {
    if (Platform.OS !== 'android') return 0;
    return scannerInstance.uninitializeScanner();
  },

  /**
   * Starts fingerprint capture process.
   * @param minQuality Minimum quality required for a valid scan (0-100, default 55)
   * @param timeoutMs Timeout in milliseconds (default 15000)
   */
  startCapture: async (minQuality: number = 55, timeoutMs: number = 15000): Promise<FingerprintCaptureResult> => {
    if (Platform.OS !== 'android') {
      throw new Error('Mantra Scanner is only supported on Android devices.');
    }
    return scannerInstance.startCapture(minQuality, timeoutMs);
  },

  /**
   * Cancels/Stops active capture session.
   */
  stopCapture: async (): Promise<number> => {
    if (Platform.OS !== 'android') return 0;
    return scannerInstance.stopCapture();
  },

  /**
   * Compares two fingerprint base64 ISO templates locally.
   * @returns Match score (values >= 14000 generally signify a correct match)
   */
  matchFingerprints: async (template1Base64: string, template2Base64: string): Promise<number> => {
    if (Platform.OS !== 'android') return -1;
    return scannerInstance.matchFingerprints(template1Base64, template2Base64);
  },

  /**
   * Compares a base64 ISO template against a list of user templates locally.
   * @returns The MatchedUserResult containing user details and score, or null if no match found.
   */
  matchUser: async (
    currentTemplateBase64: string,
    userList: UserTemplateRecord[]
  ): Promise<MatchedUserResult | null> => {
    if (Platform.OS !== 'android') return null;
    
    // Filter list to only users that have a valid registered fingerprint template
    const validUsers = userList.filter((u) => !!u.fingerprintTemplate);
    if (validUsers.length === 0) return null;

    return scannerInstance.matchUser(currentTemplateBase64, validUsers);
  },

  /**
   * Add listeners for native events (e.g., 'onDeviceAttached', 'onDeviceDetached', 'onPreview')
   */
  addListener: (
    eventName: 'onDeviceAttached' | 'onDeviceDetached' | 'onHostCheckFailed' | 'onPreview',
    handler: (data: any) => void
  ) => {
    if (!scannerEventEmitter) return { remove: () => {} };
    return scannerEventEmitter.addListener(eventName, handler);
  },
};
