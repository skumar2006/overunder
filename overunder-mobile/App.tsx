import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Import screens
import { HomeScreen } from './src/screens/HomeScreen';
import { CommunitiesScreen } from './src/screens/CommunitiesScreen';
import { FriendsScreen } from './src/screens/FriendsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabBarIcon({ name, color }: { name: string; color: string }) {
  const iconMap: { [key: string]: string } = {
    Home: '🏠',
    Communities: '🏘️',
    Friends: '👥',
    Profile: '👤',
  };
  
  return (
    <Text style={{ fontSize: 24, color }}>{iconMap[name] || '?'}</Text>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color }) => <TabBarIcon name={route.name} color={color} />,
            tabBarActiveTintColor: '#333',
            tabBarInactiveTintColor: '#999',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#f0f0f0',
              paddingBottom: 5,
              paddingTop: 5,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
            },
            headerShown: false,
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Communities" component={CommunitiesScreen} />
          <Tab.Screen name="Friends" component={FriendsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
