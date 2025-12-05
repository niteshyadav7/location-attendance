import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getFirestore, collection, query, orderBy, onSnapshot, limit, updateDoc, doc, where, writeBatch } from '@react-native-firebase/firestore';
import { Notification } from '../types';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';

export const AdminNotificationScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore();
    // Listen to last 50 notifications
    const q = query(
        collection(db, 'notifications'), 
        orderBy('timestamp', 'desc'), 
        limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc: any) => {
        notifs.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAllAsRead = async () => {
    const db = getFirestore();
    const batch = writeBatch(db);
    
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    unread.forEach(n => {
        const ref = doc(db, 'notifications', n.id);
        batch.update(ref, { read: true });
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error marking as read", error);
    }
  };

  const getIcon = (type: string) => {
      switch (type) {
          case 'CHECK_IN': return 'log-in-outline';
          case 'CHECK_OUT': return 'log-out-outline';
          case 'BREAK_START': return 'cafe-outline';
          case 'BREAK_END': return 'briefcase-outline';
          default: return 'notifications-outline';
      }
  };

  const getColor = (type: string) => {
      switch (type) {
          case 'CHECK_IN': return '#4caf50';
          case 'CHECK_OUT': return '#f44336';
          case 'BREAK_START': return '#ff9800';
          case 'BREAK_END': return '#2196f3';
          default: return '#666';
      }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <View style={[styles.card, !item.read && styles.unreadCard]}>
      <View style={[styles.iconContainer, { backgroundColor: getColor(item.type) }]}>
        <Icon name={getIcon(item.type)} size={24} color="#fff" />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{format(item.timestamp, 'PP p')}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#667eea" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      backgroundColor: '#fff',
      elevation: 2,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  markReadText: { color: '#667eea', fontWeight: '600' },
  list: { padding: 15 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 1,
  },
  unreadCard: {
      backgroundColor: '#e3f2fd',
  },
  iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
  },
  contentContainer: {
      flex: 1,
  },
  message: {
      fontSize: 14,
      color: '#333',
      marginBottom: 4,
  },
  time: {
      fontSize: 12,
      color: '#888',
  },
  dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#2196f3',
      marginLeft: 10,
  },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#888' },
});
