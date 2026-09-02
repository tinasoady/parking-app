import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EntryScreen } from '../screens/EntryScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { DayDetailScreen } from '../screens/DayDetailScreen';
import { PrinterScreen } from '../screens/PrinterScreen';
import { colors } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerShadowVisible: false,
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen as any} options={{ title: 'Accueil' }} />
      <Tab.Screen name="Checkout" component={CheckoutScreen as any} options={{ title: 'Sorties' }} />
      <Tab.Screen name="History" component={HistoryScreen as any} options={{ title: 'Historique' }} />
      <Tab.Screen name="Settings" component={SettingsScreen as any} options={{ title: 'Réglages' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Entry" component={EntryScreen} options={{ title: 'Nouvelle entrée', presentation: 'modal' }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Paiement', presentation: 'modal' }} />
      <Stack.Screen name="DayDetail" component={DayDetailScreen} options={{ title: 'Détail de la journée' }} />
      <Stack.Screen name="Printer" component={PrinterScreen} options={{ title: 'Imprimante' }} />
    </Stack.Navigator>
  );
}
