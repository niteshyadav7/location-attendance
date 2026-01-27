import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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
  const [loading, setLoading] = useState(false);
  const [initialPosition, setInitialPosition] = useState({ lat: 12.9716, lng: 77.5946 }); // Bangalore
  const webViewRef = useRef<WebView>(null);
  const navigation = useNavigation();
  const { addLocation } = useLocations();
  const user = useAuthStore((state) => state.user); // MULTI-TENANCY: Get current user
  const { effectiveBannerId, shouldShowAd } = useAds();
  const showAd = shouldShowAd('adminLocations');


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

  const handleSave = async () => {
    if (!name || !marker) {
      Alert.alert('Error', 'Please enter name and select location');
      return;
    }
    
    // MULTI-TENANCY: Check if user has organizationId
    if (!user?.organizationId) {
      Alert.alert('Error', 'User organization not found. Please contact support.');
      return;
    }
    
    setLoading(true);
    try {
      await addLocation({
        name,
        radius: parseInt(radius),
        latitude: marker.lat,
        longitude: marker.lng,
        organizationId: user.organizationId, // MULTI-TENANCY: Include organizationId
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
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

  const htmlContent = `
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
        var map = L.map('map').setView([${initialPosition.lat}, ${initialPosition.lng}], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        var marker = ${marker ? `L.marker([${marker.lat}, ${marker.lng}]).addTo(map)` : 'null'};

        map.on('click', function(e) {
          if (marker) {
            map.removeLayer(marker);
          }
          marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapClick',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }));
        });
      </script>
    </body>
    </html>
  `;

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
