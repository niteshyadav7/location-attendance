import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { useAuthStore } from '../store/useAuthStore';
import { LoginScreen } from '../screens/LoginScreen';
import { AdminHomeScreen } from '../screens/AdminHomeScreen';
import { AdminNotificationScreen } from '../screens/AdminNotificationScreen';
import { AddLocationScreen } from '../screens/AddLocationScreen';
import { EditLocationScreen } from '../screens/EditLocationScreen';
import { ManageUsersScreen } from '../screens/ManageUsersScreen';
import { UserHomeScreen } from '../screens/UserHomeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { LeaveScreen } from '../screens/LeaveScreen';
import { AdminLeaveScreen } from '../screens/AdminLeaveScreen';
import { AdminNoticeScreen } from '../screens/AdminNoticeScreen';
import { PermissionScreen } from '../screens/PermissionScreen';
import { UserDetailsScreen } from '../screens/UserDetailsScreen';
import { UserProfile } from '../types';
import { ActivityIndicator, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AdminStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Locations' }} />
    <Stack.Screen name="AddLocation" component={AddLocationScreen} options={{ title: 'Add Location' }} />
    <Stack.Screen name="EditLocation" component={EditLocationScreen} options={{ title: 'Edit Location' }} />
    <Stack.Screen name="ManageUsers" component={ManageUsersScreen} options={{ title: 'Manage Users' }} />
    <Stack.Screen name="AdminNotifications" component={AdminNotificationScreen} options={{ title: 'Notifications' }} />
  </Stack.Navigator>
);

const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="DashboardHome" 
      component={AdminDashboardScreen} 
      options={{ title: 'Dashboard' }} 
    />
    <Stack.Screen 
      name="UserDetails" 
      component={UserDetailsScreen} 
      options={{ title: 'User Details' }} 
    />
  </Stack.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator screenOptions={({ route }) => ({
    tabBarIcon: ({ focused, color, size }) => {
      let iconName;
      if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
      else if (route.name === 'Locations') iconName = focused ? 'map' : 'map-outline';
      else if (route.name === 'Notices') iconName = focused ? 'megaphone' : 'megaphone-outline';
      else if (route.name === 'Leaves') iconName = focused ? 'calendar' : 'calendar-outline';
      else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
      else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
      return <Ionicons name={iconName as any} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#667eea',
    tabBarInactiveTintColor: '#999',
    tabBarStyle: {
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#e9ecef',
      elevation: 8,
      height: 60,
      paddingBottom: 8,
      paddingTop: 8,
    },
  })}>
    <Tab.Screen name="Dashboard" component={DashboardStack} options={{ headerShown: false }} />
    <Tab.Screen name="Locations" component={AdminStack} options={{ headerShown: false }} />
    <Tab.Screen name="Notices" component={AdminNoticeScreen} options={{ title: 'Notice Board' }} />
    <Tab.Screen name="Leaves" component={AdminLeaveScreen} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Profile" component={SettingsScreen} options={{ title: 'Profile' }} />
  </Tab.Navigator>
);

const UserTabs = () => (
  <Tab.Navigator screenOptions={({ route }) => ({
    tabBarIcon: ({ focused, color, size }) => {
      let iconName;
      if (route.name === 'Attendance') iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
      else if (route.name === 'Leaves') iconName = focused ? 'calendar' : 'calendar-outline';
      else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
      else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
      return <Ionicons name={iconName as any} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#667eea',
    tabBarInactiveTintColor: '#999',
    tabBarStyle: {
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#e9ecef',
      elevation: 8,
      height: 60,
      paddingBottom: 8,
      paddingTop: 8,
    },
  })}>
    <Tab.Screen name="Attendance" component={UserHomeScreen} />
    <Tab.Screen name="Leaves" component={LeaveScreen} />
    <Tab.Screen name="History" component={HistoryScreen} />
    <Tab.Screen name="Profile" component={SettingsScreen} options={{ title: 'Profile' }} />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const { user, setUser, loading, setLoading } = useAuthStore();
  const [permissionsRequested, setPermissionsRequested] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          
          // Check if user is approved before allowing access
          // Don't call signOut here - it causes infinite loop
          // The LoginScreen will handle signout after signup
          if (userData.status === 'pending') {
            // User is not approved yet - don't set user in store
            // This prevents navigation to the main app
            setUser(null);
          } else if (userData.status === 'rejected') {
            // User was rejected - don't set user
            setUser(null);
          } else if (userData.isActive === false) {
            // User account is deactivated - don't set user
            setUser(null);
          } else {
            // User is approved and active - allow access
            setUser(userData);
          }
        } else {
             // Fallback if user doc missing but auth exists
             // Don't set user as we need proper user data
             setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      const requested = await AsyncStorage.getItem('permissions_requested');
      setPermissionsRequested(requested === 'true');
    };
    checkPermissions();
  }, []);

  if (loading || permissionsRequested === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Show permission screen if user is logged in and permissions not requested yet
  if (user && !permissionsRequested) {
    return <PermissionScreen onComplete={() => setPermissionsRequested(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'admin' ? (
          <Stack.Screen name="AdminApp" component={AdminTabs} />
        ) : (
          <Stack.Screen name="UserApp" component={UserTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
