import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocations } from '../hooks/useLocations';
import { getCurrentLocation, requestLocationPermission } from '../services/location';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore'; // MULTI-TENANCY
import { useAds } from '../hooks/useAds';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';


export const AddLocationScreen = () => {
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('50');
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ lat: 12.9716, lng: 77.5946 }); // Bangalore
  const webViewRef = useRef<WebView>(null);
  const navigation = useNavigation();
  const { addLocation } = useLocations();
  const user = useAuthStore((state) => state.user); // MULTI-TENANCY: Get current user
  const [wifiLockEnabled, setWifiLockEnabled] = useState(false);
  const [wifiSSID, setWifiSSID] = useState('');
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
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
      </style>
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
        setMarker(coords);
      } catch (err) {
        console.log('Location error:', err);
      }
    };
    
    initLocation();
  }, []);

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

  const handleSave = async () => {
    console.log('📍 [handleSave] name:', name, 'marker:', marker, 'radius:', radius, 'user.orgId:', user?.organizationId, 'user.role:', user?.role);
    if (!name || !marker) {
      Alert.alert('Error', 'Please enter name and select location on the map');
      return;
    }
    
    // MULTI-TENANCY: Check if user has organizationId
    if (!user?.organizationId) {
      console.error('📍 [handleSave] No organizationId! user:', JSON.stringify(user));
      Alert.alert('Error', 'User organization not found. Please re-login or contact support.');
      return;
    }
    
    setLoading(true);
    try {
      const locationData = {
        name,
        radius: parseInt(radius) || 50,
        latitude: marker.lat,
        longitude: marker.lng,
        organizationId: user.organizationId, // MULTI-TENANCY: Include organizationId
        wifiLockEnabled,
        wifiSSID: wifiLockEnabled ? wifiSSID.trim() : '',
      };
      console.log('📍 [handleSave] Calling addLocation with:', JSON.stringify(locationData));
      await addLocation(locationData);
      console.log('📍 [handleSave] Location added successfully!');
      navigation.goBack();
    } catch (error: any) {
      console.error('📍 [handleSave] ERROR:', error.code, error.message, error);
      Alert.alert('Error Adding Location', `${error.message || 'Unknown error'}\n\nCode: ${error.code || 'N/A'}`);
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

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Location Name"
          value={name}
          onChangeText={setName}
          placeholderTextColor={COLORS.text.light}
        />
        <TextInput
          style={styles.input}
          placeholder="Radius (meters)"
          value={radius}
          onChangeText={setRadius}
          keyboardType="numeric"
          placeholderTextColor={COLORS.text.light}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              placeholder="Latitude"
              value={latInput}
              onChangeText={handleLatChange}
              keyboardType="numeric"
              placeholderTextColor={COLORS.text.light}
            />
          </View>
          <View style={{ flex: 1 }}>
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

        {/* Wi-Fi Lockdown Configuration */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10, paddingHorizontal: 4 }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: COLORS.text.primary }}>🛜 Store Wi-Fi Lockdown</Text>
            <Text style={{ fontSize: 11, color: COLORS.text.secondary, marginTop: 2 }}>Bypass GPS Geofence if connected</Text>
          </View>
          <Switch
            value={wifiLockEnabled}
            onValueChange={setWifiLockEnabled}
            trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>

        {wifiLockEnabled && (
          <TextInput
            style={styles.input}
            placeholder="Store Wi-Fi Name (SSID)"
            value={wifiSSID}
            onChangeText={setWifiSSID}
            placeholderTextColor={COLORS.text.light}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}
      </View>
      
      <View style={{ alignItems: 'center', backgroundColor: COLORS.background, marginBottom: 10 }}>
        {showAd && (
          <BannerAd
            unitId={effectiveBannerId}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
          />
        )}
      </View>

      <View style={styles.mapContainer}>
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
        <Text style={styles.hint}>Tap on map to set location</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Save Location</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  form: { padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: COLORS.white,
    color: COLORS.text.primary,
  },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  hint: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 5,
    zIndex: 10,
    color: COLORS.text.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});
