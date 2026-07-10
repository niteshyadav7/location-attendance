import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocations, useLocationDetails } from '../hooks/useLocations';
import { getCurrentLocation, requestLocationPermission } from '../services/location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { useAds } from '../hooks/useAds';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import DatePicker from 'react-native-date-picker';
import { format, parse } from 'date-fns';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const EditLocationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const locationId = route.params?.locationId;
  
  const { location, loading: initialLoading } = useLocationDetails(locationId);
  const { updateLocation } = useLocations();

  const [name, setName] = useState('');
  const [radius, setRadius] = useState('50');
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ lat: 12.9716, lng: 77.5946 });
  
  // Break Settings
  const [breakEnabled, setBreakEnabled] = useState(false);
  const [breakDuration, setBreakDuration] = useState('60');
  
  // Wi-Fi Setup
  const [wifiLockEnabled, setWifiLockEnabled] = useState(false);
  const [wifiSSID, setWifiSSID] = useState('');
  
  const webViewRef = useRef<WebView>(null);
  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('adminLocations');

  // Keep htmlContent completely static so the WebView NEVER reloads
  const htmlContent = useRef(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style> body { margin: 0; padding: 0; } #map { width: 100%; height: 100vh; } </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([12.9716, 77.5946], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        var marker = null;

        window.updateMarker = function(lat, lng) {
          if (marker) {
            map.removeLayer(marker);
          }
          marker = L.marker([lat, lng]).addTo(map);
          map.setView([lat, lng], 15);
        };

        map.on('click', function(e) {
          window.updateMarker(e.latlng.lat, e.latlng.lng);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapClick',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }));
        });
      </script>
    </body>
    </html>
  `).current;

  useEffect(() => {
    const initLocation = async () => {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Location permission is required to use maps.');
        return;
      }
      try {
        const pos = await getCurrentLocation();
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setInitialPosition(coords);
      } catch (err) {
        console.log('Location error:', err);
      }
    };
    initLocation();
  }, []);

  useEffect(() => {
    if (location) {
      setName(location.name);
      setRadius(location.radius.toString());
      const coords = { lat: location.latitude, lng: location.longitude };
      setMarker(coords);
      setInitialPosition(coords);
      
      if (location.breakSettings) {
        setBreakEnabled(location.breakSettings.isEnabled);
        setBreakDuration(location.breakSettings.durationMinutes.toString());
      }
      
      setWifiLockEnabled(location.wifiLockEnabled || false);
      setWifiSSID(location.wifiSSID || '');
    }
  }, [location]);

  // Sync state changes to input boxes and trigger WebView JS update
  useEffect(() => {
    if (marker) {
      const parsedLat = parseFloat(latInput);
      const parsedLng = parseFloat(lngInput);
      if (isNaN(parsedLat) || Math.abs(parsedLat - marker.lat) > 0.00001) {
        setLatInput(marker.lat.toFixed(6));
      }
      if (isNaN(parsedLng) || Math.abs(parsedLng - marker.lng) > 0.00001) {
        setLngInput(marker.lng.toFixed(6));
      }
      webViewRef.current?.injectJavaScript(`if (window.updateMarker) { window.updateMarker(${marker.lat}, ${marker.lng}); }`);
    }
  }, [marker]);

  const handleLatChange = (text: string) => {
    setLatInput(text);
    const val = parseFloat(text);
    if (!isNaN(val)) {
      setMarker(prev => {
        const next = prev ? { ...prev, lat: val } : { lat: val, lng: parseFloat(lngInput) || 77.5946 };
        webViewRef.current?.injectJavaScript(`if (window.updateMarker) { window.updateMarker(${next.lat}, ${next.lng}); }`);
        return next;
      });
    }
  };

  const handleLngChange = (text: string) => {
    setLngInput(text);
    const val = parseFloat(text);
    if (!isNaN(val)) {
      setMarker(prev => {
        const next = prev ? { ...prev, lng: val } : { lat: parseFloat(latInput) || 12.9716, lng: val };
        webViewRef.current?.injectJavaScript(`if (window.updateMarker) { window.updateMarker(${next.lat}, ${next.lng}); }`);
        return next;
      });
    }
  };

  const handleUpdate = async () => {
    console.log('📍 [handleUpdate] name:', name, 'marker:', marker, 'locationId:', locationId);
    if (!name || !marker) {
      Alert.alert('Error', 'Please enter name and select location');
      return;
    }
    setLoading(true);
    try {
      const updateData = {
        name,
        radius: parseInt(radius) || 50,
        latitude: marker.lat,
        longitude: marker.lng,
        breakSettings: {
          isEnabled: breakEnabled,
          durationMinutes: parseInt(breakDuration) || 60,
          startTime: '',
          endTime: '',
        },
        wifiLockEnabled,
        wifiSSID: wifiLockEnabled ? wifiSSID.trim() : '',
      };
      console.log('📍 [handleUpdate] Calling updateLocation with:', JSON.stringify(updateData));
      await updateLocation(locationId, updateData);
      console.log('📍 [handleUpdate] Location updated successfully!');
      Alert.alert('Success', 'Location updated successfully');
      navigation.goBack();
    } catch (error: any) {
      console.error('📍 [handleUpdate] ERROR:', error.code, error.message, error);
      Alert.alert('Error Updating Location', `${error.message || 'Unknown error'}\n\nCode: ${error.code || 'N/A'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapClick') {
        setMarker({ lat: data.lat, lng: data.lng });
      }
    } catch (err) {
      console.log('Error parsing message:', err);
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          
          <Text style={styles.headerTitle}>Edit Location</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Location Details</Text>
            
            <Text style={styles.label}>Location Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Main Office"
                value={name}
                onChangeText={setName}
                placeholderTextColor={COLORS.text.light}
              />
            </View>

            <Text style={styles.label}>Geo-Fence Radius (meters)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 50"
                value={radius}
                onChangeText={setRadius}
                keyboardType="numeric"
                placeholderTextColor={COLORS.text.light}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Latitude</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Latitude"
                    value={latInput}
                    onChangeText={handleLatChange}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.text.light}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Longitude</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Longitude"
                    value={lngInput}
                    onChangeText={handleLngChange}
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.text.light}
                  />
                </View>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>🛜 Store Wi-Fi Lockdown</Text>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Bypass geofence when connected</Text>
              </View>
              <Switch
                value={wifiLockEnabled}
                onValueChange={setWifiLockEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            {wifiLockEnabled && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Store Wi-Fi Name (SSID)</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Yash_Store_5G"
                    value={wifiSSID}
                    onChangeText={setWifiSSID}
                    placeholderTextColor={COLORS.text.light}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}
          </View>

          {showAd && (
            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <BannerAd
                unitId={effectiveBannerId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{ requestNonPersonalizedAdsOnly: true }}
              />
            </View>
          )}

           <View style={{height: 250, borderRadius: 12, overflow: 'hidden', marginTop: 5, marginBottom: 20}}>
             <WebView
               ref={webViewRef}
               source={{ html: htmlContent }}
               style={styles.map}
               onMessage={handleMessage}
               javaScriptEnabled={true}
               domStorageEnabled={true}
               onLoadEnd={() => {
                 if (marker) {
                   webViewRef.current?.injectJavaScript(`if (window.updateMarker) { window.updateMarker(${marker.lat}, ${marker.lng}); }`);
                 }
               }}
             />
             <View style={styles.hintContainer}>
                 <Text style={styles.hintText}>Tap map to move pin</Text>
             </View>
           </View>

      </ScrollView>

      <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Update Location</Text>}
          </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' }, // Light gray background
  scrollContent: { padding: 16, paddingBottom: 100 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  card: {
      backgroundColor: COLORS.white,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#6B7280', marginBottom: 6 },
  input: {
    fontSize: 16,
    color: '#111827',
    paddingVertical: 10,
  },
  inputContainer: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: '#F9FAFB',
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
  },
  suffix: { color: '#9CA3AF', fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  rowInputs: { flexDirection: 'row' },
  timeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 12,
      borderRadius: 8,
  },
  timeText: { marginLeft: 8, fontSize: 15, color: '#374151', fontWeight: '500' },
  
  map: { flex: 1 },
  hintContainer: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  hintText: { color: 'white', fontSize: 12, fontWeight: '600' },
  
  footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: COLORS.white,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});
