import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ONBOARDING_KEY } from './onboarding';
import { WHATS_NEW_KEY, WHATS_NEW_VERSION } from './whats-new';

function OnboardingGate() {
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (val !== 'true') {
        router.replace('/onboarding' as any);
      }
    });
  }, [router]);

  return null;
}

function WhatsNewGate() {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const [onboarded, seen] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY),
        AsyncStorage.getItem(WHATS_NEW_KEY),
      ]);
      // Only show for existing users who haven't seen this version yet
      if (onboarded === 'true' && seen !== WHATS_NEW_VERSION) {
        router.replace('/whats-new' as any);
      }
    }
    check();
  }, [router]);

  return null;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="whats-new" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="compute" options={{ headerBackTitle: 'Back' }} />
          <Stack.Screen name="result" options={{ headerBackTitle: 'Compute' }} />
          <Stack.Screen name="vat-calculator" options={{ headerBackTitle: 'Back' }} />
          <Stack.Screen name="about" options={{ title: 'About', headerBackTitle: 'Home' }} />
          <Stack.Screen name="history" options={{ headerBackTitle: 'Home' }} />
          <Stack.Screen name="report" options={{ headerBackTitle: 'Result' }} />
          <Stack.Screen name="document-vault" options={{ headerBackTitle: 'Home' }} />
          <Stack.Screen name="discount-id" options={{ headerBackTitle: 'Home' }} />
        </Stack>
        <OnboardingGate />
        <WhatsNewGate />
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
