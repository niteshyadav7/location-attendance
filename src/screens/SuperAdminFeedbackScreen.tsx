import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFeedback } from '../hooks/useFeedback';
import { Feedback } from '../types';
import { COLORS } from '../constants/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';

export const SuperAdminFeedbackScreen = ({ navigation }: any) => {
  const { feedbacks, loading, updateFeedbackStatus, deleteFeedback } = useFeedback();

  const handleMarkAsRead = async (item: Feedback) => {
    try {
      await updateFeedbackStatus(item.id, 'read');
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };
  
  const handleArchive = async (item: Feedback) => {
      try {
        await updateFeedbackStatus(item.id, 'archived');
      } catch (error) {
        Alert.alert('Error', 'Failed to archive feedback');
      }
  };

  const handleDelete = (item: Feedback) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
             try {
                 await deleteFeedback(item.id);
             } catch (error) {
                 Alert.alert('Error', 'Failed to delete feedback');
             }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Feedback }) => (
    <View style={[styles.card, item.status === 'new' && styles.newCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
           <Text style={styles.userName}>{item.userName}</Text>
           <Text style={styles.userEmail}>{item.userEmail}</Text>
        </View>
        <Text style={styles.date}>{format(item.timestamp, 'MMM dd, yyyy')}</Text>
      </View>
      
      <Text style={styles.content}>{item.content}</Text>
      
      <View style={styles.cardFooter}>
         <View style={styles.statusBadge}>
             <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
         </View>
         
         <View style={styles.actions}>
             {item.status === 'new' && (
                 <TouchableOpacity style={styles.actionButton} onPress={() => handleMarkAsRead(item)}>
                     <Icon name="checkmark-circle-outline" size={20} color={COLORS.status.working} />
                 </TouchableOpacity>
             )}
              {item.status !== 'archived' && (
                 <TouchableOpacity style={styles.actionButton} onPress={() => handleArchive(item)}>
                     <Icon name="archive-outline" size={20} color={COLORS.status.onBreak} />
                 </TouchableOpacity>
             )}
             <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
                 <Icon name="trash-outline" size={20} color={COLORS.status.offline} />
             </TouchableOpacity>
         </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Feedback</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={feedbacks}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No feedback available.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
      marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  newCard: {
      borderLeftWidth: 4,
      borderLeftColor: COLORS.primary,
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
  },
  userInfo: {
      flex: 1,
  },
  userName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.text.primary,
  },
  userEmail: {
      fontSize: 12,
      color: COLORS.text.secondary,
  },
  date: {
      fontSize: 12,
      color: COLORS.text.light,
  },
  content: {
      fontSize: 14,
      color: COLORS.text.primary,
      lineHeight: 20,
      marginBottom: 12,
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#f3f4f6',
      paddingTop: 12,
  },
  statusBadge: {
      backgroundColor: '#f3f4f6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
  },
  statusText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: COLORS.text.secondary,
  },
  actions: {
      flexDirection: 'row',
      gap: 16,
  },
  actionButton: {
      padding: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
});
