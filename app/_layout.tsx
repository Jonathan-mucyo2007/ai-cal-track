import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { tokenCache } from '../hooks/useTokenCache';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { isUserProfileComplete } from '../services/storageService';
import { Colors } from '../styles/colors';
import { profileBootstrapService } from '../services/profileBootstrapService';
import { DateProvider } from '../contexts/DateContext';
// Make sure to add this to your .env file
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const [isRoutingReady, setIsRoutingReady] = useState(false);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const firstSegment = segments[0];
  const currentPath = segments.join('/');

  useEffect(() => {
    let isActive = true;

    const bootstrap = async () => {
      if (!isLoaded) return;

      const inAuthGroup = firstSegment === '(auth)';
      const inWelcome = currentPath === 'welcome';
      const inOnboarding = currentPath === 'onboarding';

      if (!isSignedIn) {
        if (!inWelcome && !inAuthGroup) {
          router.replace('/welcome');
        }
        if (isActive) setIsRoutingReady(true);
        return;
      }

      if (isSignedIn && user) {
        const { profile } = await profileBootstrapService.resolveProfile(user);
        if (!isActive) return;

        const needsOnboarding = !isUserProfileComplete(profile);

        if (needsOnboarding && !inOnboarding) {
          router.replace('/onboarding');
          setIsRoutingReady(true);
          return;
        }

        if (!needsOnboarding && (inAuthGroup || inWelcome || inOnboarding)) {
          router.replace('/');
        }
        setIsRoutingReady(true);
      }
    };

    bootstrap();

    return () => {
      isActive = false;
    };
  }, [currentPath, firstSegment, isLoaded, isSignedIn, router, user]);

  if (!isRoutingReady) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.background }]}>
        <View style={styles.loadingOrb}>
          <ActivityIndicator size="large" color="#00F5D4" />
        </View>
        <Text style={[styles.loadingTitle, { color: theme.text }]}>Preparing your AI coach</Text>
        <Text style={[styles.loadingSubtitle, { color: theme.textSecondary }]}>Syncing your account, profile, and personalized experience.</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="log-exercise" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="workout-details" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="workout-summary" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="manual-calorie-log" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="log-water" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="food-search" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
};

export default function RootLayout() {
  if (!publishableKey) {
    console.warn("Missing Clerk Publishable Key - Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env");
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <DateProvider>
          <InitialLayout />
        </DateProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  loadingOrb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
});
