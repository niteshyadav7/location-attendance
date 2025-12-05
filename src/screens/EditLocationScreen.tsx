import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { getFirestore, doc, updateDoc, getDoc } from '@react-native-firebase/firestore';
import { getCurrentLocation, requestLocationPermission } from '../services/location';
import { useNavigation, useRoute } from '@react-navigation/native';

export const EditLocationScreen = () => {
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('50');
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialPosition, setInitialPosition] = useState({ lat: 12.9716, lng: 77.5946 }); // Bangalore
  const webViewRef = useRef<WebView>(null);
  const navigation = useNavigation();
  const route = useRoute<any>();
  const locationId = route.params?.locationId;

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
    const loadLocation = async () => {
      if (!locationId) {
        Alert.alert('Error', 'Location ID not provided');
        navigation.goBack();
        return;
      }

      try {
        const db = getFirestore();
        const locationDoc = await getDoc(doc(db, 'locations', locationId));
        
        if (locationDoc.exists()) {
          const data = locationDoc.data();
          if (data) {
            setName(data.name);
            setRadius(data.radius.toString());
            const coords = { lat: data.latitude, lng: data.longitude };
            setMarker(coords);
            setInitialPosition(coords);
          }
        } else {
          Alert.alert('Error', 'Location not found');
          navigation.goBack();
        }
      } catch (error: any) {
        Alert.alert('Error', error.message);
        navigation.goBack();
      } finally {
        setInitialLoading(false);
      }
    };

    loadLocation();
  }, [locationId]);

  const handleUpdate = async () => {
    if (!name || !marker) {
      Alert.alert('Error', 'Please enter name and select location');
      return;
    }
    setLoading(true);
    try {
      const db = getFirestore();
      await updateDoc(doc(db, 'locations', locationId), {
        name,
        radius: parseInt(radius),
        latitude: marker.lat,
        longitude: marker.lng,
        updatedAt: Date.now(),
      });
      Alert.alert('Success', 'Location updated successfully');
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

  if (initialLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Location Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Radius (meters)"
          value={radius}
          onChangeText={setRadius}
          keyboardType="numeric"
        />
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
        <Text style={styles.hint}>Tap on map to update location</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Location</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
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
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
