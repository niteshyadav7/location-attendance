import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Switch, TextInput, Alert, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants/theme';
import { LocationConfig } from '../types';
import DatePicker from 'react-native-date-picker';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
import { format, parse } from 'date-fns';

interface Props {
  visible: boolean;
  onClose: () => void;
  location: LocationConfig | null;
  onSuccess?: () => void;
}

export const LocationBreakUpdateModal = ({ visible, onClose, location, onSuccess }: Props) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (location?.breakSettings) {
        setIsEnabled(location.breakSettings.isEnabled);
    } else {
        setIsEnabled(false);
    }
  }, [location]);

  const handleSave = async () => {
      if (!location) return;
      setSaving(true);
      try {
          const db = getFirestore();
          
          await updateDoc(doc(db, 'locations', location.id), {
              breakSettings: {
                  isEnabled,
                  durationMinutes: 9999, // Unlimited
                  startTime: '',
                  endTime: '',
              }
          });
          Alert.alert("Success", "Break policy updated successfully!");
          if (onSuccess) onSuccess();
          onClose();
      } catch (err: any) {
          Alert.alert("Error", "Failed to save break settings: " + err.message);
      } finally {
          setSaving(false);
      }
  };

  if (!location) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Ionicons name="cafe" size={24} color={COLORS.primary} />
                    <Text style={styles.title}>Break Policy</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>Configure breaks for {location.name}</Text>

            <View style={styles.form}>
                <View style={styles.row}>
                    <Text style={styles.label}>Enable Breaks</Text>
                    <Switch
                        value={isEnabled}
                        onValueChange={setIsEnabled}
                        trackColor={{ false: '#767577', true: COLORS.primary }}
                        thumbColor={'#f4f3f4'}
                    />
                </View>



                <TouchableOpacity 
                    style={[styles.saveButton, !isEnabled && { marginTop: 20 }]} 
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
      </View>


    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
      fontSize: 14,
      color: '#6B7280',
      marginBottom: 24,
  },
  closeBtn: {
      padding: 4,
  },
  form: {
      gap: 20,
  },
  row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
  },
  label: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 8,
  },
  inputGroup: {
      
  },
  input: {
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: '#111827',
      backgroundColor: '#F9FAFB',
  },
  rowInputs: {
      flexDirection: 'row',
  },
  timeButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      padding: 12,
      backgroundColor: '#F9FAFB',
  },
  timeText: {
      fontSize: 16,
      color: '#111827',
      fontWeight: '500',
  },
  saveButton: {
      backgroundColor: COLORS.primary,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 10,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
  },
  saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
  },
});
