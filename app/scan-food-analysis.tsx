import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../styles/colors';
import { useSafeBack } from '../hooks/useSafeBack';

const STEP_DELAYS = [700, 1800, 3000];

const stepConfig = [
  {
    title: 'Analyzing Food',
    subtitle: 'Detecting ingredients, portions, and visible meal structure from the image.',
    icon: 'scan-outline' as const,
    tint: '#E0F2FE',
    color: '#0284C7',
  },
  {
    title: 'Getting Nutrition Data',
    subtitle: 'Matching the detected food with calorie and macro references.',
    icon: 'nutrition-outline' as const,
    tint: '#FEF3C7',
    color: '#D97706',
  },
  {
    title: 'Preparing Final Result',
    subtitle: 'Packaging the analysis so you can continue to the next step smoothly.',
    icon: 'sparkles-outline' as const,
    tint: '#ECFDF5',
    color: '#16A34A',
  },
];

export default function ScanFoodAnalysisScreen() {
  const router = useRouter();
  const goBack = useSafeBack('/(tabs)');
  const params = useLocalSearchParams<{ imageUri?: string }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const imageUri = useMemo(
    () => (params.imageUri ? decodeURIComponent(params.imageUri) : ''),
    [params.imageUri]
  );
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    const timers = STEP_DELAYS.map((delay, index) =>
      setTimeout(() => {
        setCompletedSteps((current) => (current.includes(index) ? current : [...current, index]));
      }, delay)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const allStepsCompleted = completedSteps.length === stepConfig.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.topGlow, { backgroundColor: theme.blobStart }]} />
      <View style={[styles.bottomGlow, { backgroundColor: theme.blobEnd }]} />

      <View style={styles.headerRow}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface }]} onPress={goBack} activeOpacity={0.86}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Analyzing Food</Text>
      </View>

      <Animated.ScrollView
        entering={FadeInUp.duration(420)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeInDown.delay(90).duration(420)} style={[styles.previewCard, { backgroundColor: theme.surface }]}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewTitle, { color: theme.text }]}>Selected Image</Text>
            <Text style={[styles.previewMeta, { color: theme.textSecondary }]}>Ready for smart scan</Text>
          </View>

          <View style={[styles.imageFrame, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" transition={250} />
            ) : (
              <View style={styles.imageFallback}>
                <Ionicons name="image-outline" size={34} color={theme.textSecondary} />
                <Text style={[styles.imageFallbackText, { color: theme.textSecondary }]}>No image selected</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(460)} style={[styles.stepsCard, { backgroundColor: theme.surface }]}>
          <View style={styles.stepsHeader}>
            <Text style={[styles.stepsTitle, { color: theme.text }]}>Analysis Progress</Text>
            <Text style={[styles.stepsSubtitle, { color: theme.textSecondary }]}>
              We’re walking through each step before the next screen.
            </Text>
          </View>

          <View style={styles.stepsList}>
            {stepConfig.map((step, index) => {
              const isComplete = completedSteps.includes(index);
              const isCurrent = !isComplete && completedSteps.length === index;

              return (
                <View key={step.title} style={[styles.stepRow, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
                  <View style={[styles.stepIconWrap, { backgroundColor: isComplete ? '#DCFCE7' : step.tint }]}>
                    {isComplete ? (
                      <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                    ) : isCurrent ? (
                      <ActivityIndicator color={step.color} />
                    ) : (
                      <Ionicons name={step.icon} size={22} color={step.color} />
                    )}
                  </View>

                  <View style={styles.stepTextWrap}>
                    <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
                    <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>{step.subtitle}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>
      </Animated.ScrollView>

      <Animated.View entering={FadeInDown.delay(260).duration(400)} style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: allStepsCompleted ? theme.primary : colorScheme === 'dark' ? '#334155' : '#D1D5DB' },
          ]}
          activeOpacity={0.88}
          onPress={() => router.push('/food-search')}
          disabled={!allStepsCompleted}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Ionicons name="arrow-forward-circle" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topGlow: {
    position: 'absolute',
    top: -70,
    left: -40,
    width: 210,
    height: 210,
    borderRadius: 105,
    opacity: 0.72,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 80,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.56,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 140,
    gap: 18,
  },
  previewCard: {
    borderRadius: 30,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 7,
  },
  previewHeader: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  previewMeta: {
    fontSize: 13,
    fontWeight: '700',
  },
  imageFrame: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    aspectRatio: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  imageFallbackText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepsCard: {
    borderRadius: 30,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 6,
  },
  stepsHeader: {
    marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  stepsSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  stepsList: {
    gap: 12,
  },
  stepRow: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  stepIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  continueButton: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
