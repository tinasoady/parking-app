import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider, useSettings } from './src/state/SettingsContext';
import { DayProvider, useDay } from './src/state/DayContext';
import { AdminProvider } from './src/state/AdminContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

function AppGate({ children }: { children: React.ReactNode }) {
  const { loading: settingsLoading } = useSettings();
  const { loading: dayLoading } = useDay();

  if (settingsLoading || dayLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <DayProvider>
            <AdminProvider>
              <AppGate>
                <NavigationContainer theme={navTheme}>
                  <RootNavigator />
                </NavigationContainer>
              </AppGate>
              <StatusBar style="light" />
            </AdminProvider>
          </DayProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
