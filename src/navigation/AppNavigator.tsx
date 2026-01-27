import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
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
import { ActivityIndicator, View, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminNotificationListener } from '../services/adminNotificationListener';
import { SuperAdminDashboardScreen } from '../screens/SuperAdminDashboardScreen';
import { UserNotificationScreen } from '../screens/UserNotificationScreen';
import { useUserNotifications } from '../hooks/useUserNotifications';
import { useSmartInterstitial } from '../hooks/useSmartInterstitial';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AdminStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Settings' }} />
    <Stack.Screen name="AddLocation" component={AddLocationScreen} options={{ title: 'Add Location' }} />
    <Stack.Screen name="EditLocation" component={EditLocationScreen} options={{ title: 'Edit Location' }} />
    <Stack.Screen name="ManageUsers" component={ManageUsersScreen} options={{ title: 'Manage Users' }} />
    <Stack.Screen name="AdminNotifications" component={AdminNotificationScreen} options={{ title: 'Notifications' }} />
    <Stack.Screen name="Notices" component={AdminNoticeScreen} options={{ title: 'Manage Notices' }} />
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
    <Stack.Screen 
      name="UserWalletHistory" 
      component={MoneyManagementScreen} 
      options={{ headerShown: false }} 
    />
  </Stack.Navigator>
);

import { SuperAdminFeedbackScreen } from '../screens/SuperAdminFeedbackScreen';
import { SuperAdminAppUpdatesScreen } from '../screens/SuperAdminAppUpdatesScreen';

const SuperAdminStack = () => (
    <Stack.Navigator>
        <Stack.Screen 
            name="SuperAdminDashboard" 
            component={SuperAdminDashboardScreen} 
            options={{ headerShown: false }} 
        />
        <Stack.Screen 
            name="UserDetails" 
            component={UserDetailsScreen} 
            options={{ title: 'User Details' }} 
        />
        <Stack.Screen 
            name="Feedback" 
            component={SuperAdminFeedbackScreen} 
            options={{ headerShown: false }} 
        />
        <Stack.Screen 
            name="AppUpdates" 
            component={SuperAdminAppUpdatesScreen} 
            options={{ headerShown: false }} 
        />
        <Stack.Screen 
            name="UserWalletHistory" 
            component={MoneyManagementScreen} 
            options={{ headerShown: false }} 
        />
    </Stack.Navigator>
);

const NotificationStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="AdminNotifications" 
      component={AdminNotificationScreen} 
      options={{ title: 'Notifications' }} 
    />
    <Stack.Screen 
      name="UserDetails" 
      component={UserDetailsScreen} 
      options={{ title: 'User Details' }} 
    />
    <Stack.Screen 
      name="UserWalletHistory" 
      component={MoneyManagementScreen} 
      options={{ headerShown: false }} 
    />
  </Stack.Navigator>
);

import { MoneyManagementScreen } from '../screens/MoneyManagementScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ProfileHome" component={SettingsScreen} options={{ title: 'Profile' }} />
    <Stack.Screen name="MoneyManagement" component={MoneyManagementScreen} options={{ headerShown: false }} />
    <Stack.Screen name="UserWalletHistory" component={MoneyManagementScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const AdminTabs = () => {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const user = useAuthStore(state => state.user);
  const { showAdIfEnabled } = useSmartInterstitial();

  // Listen for unread notifications count
  React.useEffect(() => {
    if (!user?.organizationId) return;

    const db = getFirestore();
    const q = query(
      collection(db, 'notifications'),
      where('organizationId', '==', user.organizationId),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
        console.log('Unread count error:', error);
    });

    return () => unsubscribe();
  }, [user?.organizationId]);

  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + (insets.bottom > 0 ? insets.bottom : 10);

  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
        else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
        else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        height: tabBarHeight,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
      headerShown: false // Hide tab header since stacks handle it
    })}>
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack} 
        listeners={{ tabPress: () => showAdIfEnabled('navAdminDashboard') }}
      />
      <Tab.Screen name="Settings" component={AdminStack} />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationStack} 
        options={{ 
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#FF3B30', color: '#fff' }
        }} 
      />
      <Tab.Screen name="Leaves" component={AdminLeaveScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
};

const UserTabs = () => {
  const { showAdIfEnabled } = useSmartInterstitial();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + (insets.bottom > 0 ? insets.bottom : 10);
  
  // Fetch unread notifications for badge
  const { notifications } = useUserNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
  <Tab.Navigator screenOptions={({ route }) => ({
    tabBarIcon: ({ focused, color, size }) => {
      let iconName;
      if (route.name === 'Attendance') iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
      else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      height: tabBarHeight,
      paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '600',
    },
  })}>
    <Tab.Screen 
      name="Attendance" 
      component={UserHomeScreen} 
    />
    <Tab.Screen 
      name="Notifications" 
      component={UserNotificationScreen} 
      options={{ 
        tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        tabBarBadgeStyle: { backgroundColor: '#FF3B30', color: '#fff' }
      }} 
    />
    <Tab.Screen 
      name="Leaves" 
      component={LeaveScreen} 
      listeners={{ tabPress: () => showAdIfEnabled('navLeaves') }}
    />
    <Tab.Screen 
      name="History" 
      component={HistoryScreen} 
      listeners={{ tabPress: () => showAdIfEnabled('navHistory') }}
    />
    <Tab.Screen name="Profile" component={ProfileStack} options={{ headerShown: false }} />
  </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { user, setUser, setOrganization, loading, setLoading } = useAuthStore();
  const [permissionsRequested, setPermissionsRequested] = useState<boolean | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          
          if (userData.status === 'pending') {
             console.log('User pending - restricting access');
             setUser(null);
             setOrganization(null);
             auth.signOut(); 
          } else if (userData.status === 'rejected' || userData.isActive === false) {
             setUser(null);
             setOrganization(null);
             auth.signOut();
          } else {
             // DEVICE LOCK CHECK (Enforced at App Entry)
             // Only for regular users, admins might be allowed multiple devices
             if (userData.role !== 'company_admin' && userData.role !== 'super_admin') {
                const { getUniqueId } = require('react-native-device-info');
                const currentDeviceId = await getUniqueId();
                
                if (userData.registeredDeviceId && userData.registeredDeviceId !== currentDeviceId) {
                    console.log('⛔ Device Mismatch at App Entry - Restricting Access (Keeping Auth for Reset Request)');
                    setUser(null);
                    setOrganization(null);
                    // Do NOT signOut here automatically, otherwise requestDeviceReset fails permission
                    // We rely on LoginScreen to handle the signOut if user cancels
                    return; // Stop execution (User stays on Login Screen)
                }
             }

             // MULTI-TENANCY: Load organization data if user has organizationId
             if (userData.organizationId) {
                try {
                  const orgDoc = await getDoc(doc(db, 'organizations', userData.organizationId));
                  if (orgDoc.exists()) {
                    const orgData = { id: orgDoc.id, ...orgDoc.data() };
                    setOrganization(orgData as any);
                  } else {
                    console.warn('Organization not found for user:', userData.organizationId);
                    setOrganization(null);
                  }
                } catch (orgError) {
                  console.error('Error loading organization:', orgError);
                  setOrganization(null);
                }
             } else {
                setOrganization(null);
             }

             setUser(userData);
             
             // Initialize FCM for push notifications (FOR ALL USERS)
             // This ensures everyone registers their token to receive Notices/Money Updates
             const { fcmService } = require('../services/fcmService');
             fcmService.initializeFCM(firebaseUser.uid).catch((err: any) => {
                console.error('FCM initialization error:', err);
             });

             if ((userData.role === 'company_admin' || userData.role === 'super_admin') && userData.organizationId) {
                  adminNotificationListener.startListening(firebaseUser.uid, userData.organizationId);
             }
          }
        } else {
             setUser(null);
             setOrganization(null);
        }
      } else {
        adminNotificationListener.stopListening();
        setUser(null);
        setOrganization(null);
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

  if (user && !permissionsRequested) {
    return <PermissionScreen onComplete={() => setPermissionsRequested(true)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'super_admin' ? (
          <Stack.Screen name="SuperAdminApp" component={SuperAdminStack} />
        ) : user.role === 'company_admin' ? (
          <Stack.Screen name="AdminApp" component={AdminTabs} />
        ) : (
          <Stack.Screen name="UserApp" component={UserTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
