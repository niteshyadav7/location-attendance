import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getFirestore, collection, onSnapshot, doc, deleteDoc, query, where } from '@react-native-firebase/firestore';
import { LocationConfig } from '../types';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const AdminHomeScreen = () => {
  const [locations, setLocations] = useState<LocationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const db = getFirestore();
    
    // Fetch locations
    const locationsUnsubscribe = onSnapshot(collection(db, 'locations'),
        (snapshot) => {
          const locs: LocationConfig[] = [];
          snapshot.forEach((doc: any) => {
            locs.push({ id: doc.id, ...doc.data() } as LocationConfig);
          });
          setLocations(locs);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Firestore error:', err);
          setError(err.message);
          setLoading(false);
        }
      );

    // Fetch pending users count
    const pendingUnsubscribe = onSnapshot(
      query(collection(db, 'users'), where('status', '==', 'pending')),
      (snapshot) => {
        setPendingCount(snapshot.size);
      }
    );

    // Fetch unread notifications count
    const notifUnsubscribe = onSnapshot(
        query(collection(db, 'notifications'), where('read', '==', false)),
        (snapshot) => {
            setUnreadNotifCount(snapshot.size);
        }
    );

    return () => {
      locationsUnsubscribe();
      pendingUnsubscribe();
      notifUnsubscribe();
    };
  }, []);

  const handleDelete = async (id: string) => {
    Alert.alert(
        "Delete Location",
        "Are you sure?",
        [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                const db = getFirestore();
                await deleteDoc(doc(db, 'locations', id));
            }}
        ]
    );
  };

  const handleEdit = (id: string) => {
    navigation.navigate('EditLocation', { locationId: id });
  };

  const renderItem = ({ item }: { item: LocationConfig }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>Radius: {item.radius}m</Text>
        <Text style={styles.cardSubtitle}>Lat: {item.latitude.toFixed(4)}, Lng: {item.longitude.toFixed(4)}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={() => handleEdit(item.id)} style={styles.editButton}>
          <Ionicons name="pencil" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
          <Ionicons name="trash" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#667eea" />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading locations:</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No locations added yet.</Text>}
        />
      )}
      
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
          onPress={() => navigation.navigate('AdminNotifications')}
        >
          <Text style={styles.actionButtonText}>🔔 Notifications</Text>
          {unreadNotifCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#10b981' }]}
          onPress={() => navigation.navigate('ManageUsers')}
        >
          <Text style={styles.actionButtonText}>👥 Manage Users</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
          onPress={() => navigation.navigate('Notices')}
        >
          <Text style={styles.actionButtonText}>📢 Manage Notices</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddLocation')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cardSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  editText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#667eea',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 30, marginTop: -2 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  errorText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#d32f2f', 
    marginBottom: 10 
  },
  errorMessage: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center' 
  },
  floatingButtons: {
      position: 'absolute',
      right: 20,
      bottom: 90,
      alignItems: 'flex-end',
      gap: 10,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
