import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import { Colors } from '../styles/colors';

export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.blob, styles.blobOne, { backgroundColor: theme.blobStart }]} />
      <View style={[styles.blob, styles.blobTwo, { backgroundColor: theme.blobEnd }]} />

      <Animated.View entering={FadeInUp.duration(700)} style={styles.hero}>
        <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
          <Sparkles size={16} color={theme.accentPurple} />
          <Text style={[styles.badgeText, { color: theme.text }]}>World-class nutrition guidance</Text>
        </View>

        <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />

        <Text style={[styles.title, { color: theme.text }]}>AI CaloriTracker</Text>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>Your AI-Powered Calorie Coach</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Smarter calorie targets, personalized macros, hydration guidance, and coaching recommendations built around you.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(700)} style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
          activeOpacity={0.9}
          onPress={() => router.push('/(auth)?mode=signup')}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
          <ArrowRight size={18} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
          activeOpacity={0.9}
          onPress={() => router.push('/(auth)?mode=login')}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Login</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 28,
    overflow: 'hidden',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 48,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 28,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 28,
    marginBottom: 22,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 340,
  },
  footer: {
    gap: 14,
    paddingBottom: 8,
  },
  primaryButton: {
    height: 60,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 10,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryButton: {
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  blob: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  blobOne: {
    top: -90,
    left: -80,
  },
  blobTwo: {
    bottom: 120,
    right: -100,
  },
});
