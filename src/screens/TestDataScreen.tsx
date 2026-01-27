import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { generateTestData } from '../scripts/generateTestData';
import { COLORS } from '../constants/theme';

export const TestDataScreen = () => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  const handleGenerateData = async () => {
    setLoading(true);
    setLog([]);
    
    addLog('🚀 Starting test data generation...');
    
    try {
      // Override console.log to capture logs
      const originalLog = console.log;
      console.log = (...args) => {
        addLog(args.join(' '));
        originalLog(...args);
      };

      const result = await generateTestData();
      
      // Restore console.log
      console.log = originalLog;

      if (result.success) {
        Alert.alert(
          '✅ Success!',
          'Test data generated successfully! You can now login with any of the test accounts.\n\nPassword: Test@123',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('❌ Error', result.error || 'Failed to generate test data');
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      Alert.alert('❌ Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Test Data Generator</Text>
        <Text style={styles.subtitle}>Generate dummy data for testing multi-tenancy</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📊 What will be created:</Text>
        <Text style={styles.infoText}>• 3 Organizations (TechCorp, Restaurant, Construction)</Text>
        <Text style={styles.infoText}>• 11 Users (1 Super Admin, 3 Company Admins, 7 Users)</Text>
        <Text style={styles.infoText}>• 6 Locations across all organizations</Text>
        <Text style={styles.infoText}>• 4 Notices</Text>
        <Text style={styles.infoText}>• 28 Attendance records (last 7 days)</Text>
        <Text style={styles.infoText}>• 3 Leave requests</Text>
      </View>

      <View style={styles.credentialsCard}>
        <Text style={styles.credentialsTitle}>🔑 Login Credentials:</Text>
        <Text style={styles.credentialsText}>Password for all: <Text style={styles.bold}>Test@123</Text></Text>
        <Text style={styles.credentialsText}></Text>
        <Text style={styles.credentialsText}>Super Admin:</Text>
        <Text style={styles.credentialsEmail}>  superadmin@test.com</Text>
        <Text style={styles.credentialsText}></Text>
        <Text style={styles.credentialsText}>Company Admins:</Text>
        <Text style={styles.credentialsEmail}>  admin.techcorp@test.com</Text>
        <Text style={styles.credentialsEmail}>  admin.restaurant@test.com</Text>
        <Text style={styles.credentialsEmail}>  admin.construction@test.com</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleGenerateData}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.buttonText}>🚀 Generate Test Data</Text>
        )}
      </TouchableOpacity>

      {log.length > 0 && (
        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>📝 Log:</Text>
          <ScrollView style={styles.logScroll}>
            {log.map((line, index) => (
              <Text key={index} style={styles.logText}>{line}</Text>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 6,
    paddingLeft: 8,
  },
  credentialsCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  credentialsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  credentialsText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  credentialsEmail: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  bold: {
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  logScroll: {
    flex: 1,
  },
  logText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
