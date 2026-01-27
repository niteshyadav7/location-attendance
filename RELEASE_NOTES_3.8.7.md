# Release Notes - Version 3.8.7

**Release Date**: December 30, 2024  
**Version Code**: 23  
**Version Name**: 3.8.7

## 🎯 What's New

### Bottom Navigation Fix for Gesture Mode
Addressed a specific issue where the bottom navigation bar was being covered/hidden on Android devices using Gesture Navigation.

## 🐛 Bug Fixes

### Navigation & Layout
- **Fixed**: Bottom tab bar height calculation on Android devices with Gesture Navigation enabled.
- **Fixed**: Tab bar padding adjustments to ensure content is always clickable and not obscured by the system home indicator.

## 🔧 Technical Details

### Changes
- Updated `AppNavigator.tsx`:
    - Adjusted `tabBarHeight` calculation to dynamically account for `insets.bottom`.
    - Added conditional padding to the tab bar container based on device insets.

### Version Changes
- Version Code: 22 → 23
- Version Name: 3.8.6 → 3.8.7

## 📦 Build Artifacts
- APK: `app-release.apk`
- AAB: `app-release.aab`

## 🚀 Deployment
Recommended for immediate update to resolve navigation usability issues on modern Android devices.
