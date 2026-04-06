import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../styles/colors';
import { useSafeBack } from '../hooks/useSafeBack';
import { foodScanService } from '../services/foodScanService';

type StepState = 'pending' | 'active' | 'completed' | 'error';

const stepConfig = [
  {
    title: 'Analyzing Food',
    subtitle: 'Sending the image to Gemini vision to identify the dish and serving.',
    icon: 'scan-outline' as const,
    tint: '#E0F2FE',
    color: '#0284C7',
  },
  {
    title: 'Getting Nutrition Data',
    subtitle: 'Reading calories, protein, carbs, and fats from the JSON response.',
    icon: 'nutrition-outline' as const,
    tint: '#FEF3C7',
    color: '#D97706',
  },
  {
    title: 'Preparing Final Result',
    subtitle: 'Packaging the AI result into a premium summary experience.',
    icon: 'sparkles-outline' as const,
    tint: '#ECFDF5',
    color: '#16A34A',
  },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ScanFoodInsightsScreen() {
  const router = useRouter();
  const goBack = useSafeBack('/(tabs)');
  const params = useLocalSearchParams<{ scanId?: string }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const scanId = params.scanId || '';
  const capture = useMemo(() => (scanId ? foodScanService.getCapture(scanId) : null), [scanId]);
  const [stepStates, setStepStates] = useState<StepState[]>(['active', 'pending', 'pending']);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const runAnalysis = async () => {
      if (!scanId || !capture) {
        setErrorMessage('Food image is missing. Please capture or select your image again.');
        setStepStates(['error', 'pending', 'pending']);
        setIsAnalyzing(false);
        return;
      }

      try {
        setStepStates(['active', 'pending', 'pending']);
        const result = await foodScanService.analyze(scanId);
        if (!isMounted) return;

        setStepStates(['completed', 'active', 'pending']);
        await wait(320);
        if (!isMounted) return;

        if (!result.dishName || result.caloriesKcal <= 0) {
          throw new Error('Gemini returned incomplete food nutrition data.');
        }

        setStepStates(['completed', 'completed', 'active']);
        await wait(320);
        if (!isMounted) return;

        setStepStates(['completed', 'completed', 'completed']);
        setIsAnalyzing(false);
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Unknown scan analysis error';
        console.error('Food scan analysis failed', error);
        setErrorMessage(message);
        setStepStates((current) => {
          const activeIndex = current.findIndex((step) => step === 'active');
          if (activeIndex === -1) return ['error', 'pending', 'pending'];
          return current.map((step, index) => (index === activeIndex ? 'error' : step)) as StepState[];
        });
        setIsAnalyzing(false);
      }
    };

    void runAnalysis();

    return () => {
      isMounted = false;
    };
  }, [capture, scanId]);

  const allStepsCompleted = stepStates.every((step) => step === 'completed');

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

      <Animated.ScrollView entering={FadeInUp.duration(420)} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.delay(90).duration(420)} style={[styles.previewCard, { backgroundColor: theme.surface }]}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewTitle, { color: theme.text }]}>Selected Image</Text>
            <Text style={[styles.previewMeta, { color: theme.textSecondary }]}>
              {isAnalyzing ? 'Gemini is generating structured nutrition JSON' : allStepsCompleted ? 'AI analysis ready' : 'Analysis interrupted'}
            </Text>
          </View>

          <View style={[styles.imageFrame, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
            {capture?.imageUri ? (
              <Image source={{ uri: capture.imageUri }} style={styles.previewImage} contentFit="cover" transition={250} />
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
            <Text style={[styles.stepsTitle, { color: theme.text }]}>Live Progress</Text>
            <Text style={[styles.stepsSubtitle, { color: theme.textSecondary }]}>
              These steps now track the actual Gemini request and JSON handling, not a fixed timer.
            </Text>
          </View>

          <View style={styles.stepsList}>
            {stepConfig.map((step, index) => {
              const state = stepStates[index];
              const isComplete = state === 'completed';
              const isCurrent = state === 'active';
              const isError = state === 'error';

              return (
                <View
                  key={step.title}
                  style={[
                    styles.stepRow,
                    {
                      backgroundColor: theme.background,
                      borderColor: isError ? '#FCA5A5' : theme.surfaceBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.stepIconWrap,
                      {
                        backgroundColor: isComplete ? '#DCFCE7' : isError ? '#FEE2E2' : step.tint,
                      },
                    ]}
                  >
                    {isComplete ? (
                      <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                    ) : isError ? (
                      <Ionicons name="alert-circle" size={24} color="#DC2626" />
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

          {!!errorMessage && (
            <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="warning-outline" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>

      <Animated.View entering={FadeInDown.delay(260).duration(400)} style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: allStepsCompleted ? theme.primary : colorScheme === 'dark' ? '#334155' : '#D1D5DB' },
          ]}
          activeOpacity={0.88}
          onPress={() => router.push({ pathname: '/scan-food-result', params: { scanId } })}
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
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
