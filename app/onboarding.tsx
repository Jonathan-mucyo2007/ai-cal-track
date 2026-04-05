import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import Animated, { FadeInRight, FadeOutLeft, SlideInDown } from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { doc, setDoc } from 'firebase/firestore';
import { Colors } from '../styles/colors';
import { db } from '../config/firebase';
import { storageService } from '../services/storageService';
import { nutritionPlanService, NutritionPlanResult } from '../services/nutritionPlanServiceV2';
import { ProgressBar } from '../components/onboarding/ProgressBar';
import { GenderStep } from '../components/onboarding/GenderStep';
import { GoalStep } from '../components/onboarding/GoalStep';
import { WorkoutStep } from '../components/onboarding/WorkoutStep';
import { DOBStep } from '../components/onboarding/DOBStep';
import { MeasurementsStep } from '../components/onboarding/MeasurementsStep';
import { LoadingPlanScreen } from '../components/onboarding/LoadingPlanScreen';
import { PlanSummaryScreen } from '../components/onboarding/PlanSummaryScreen';

const { width } = Dimensions.get('window');
const LOADING_MESSAGES = [
  'Analyzing your body metrics, training rhythm, and goal trajectory.',
  'Estimating smart calorie targets and a macro split you can actually sustain.',
  'Designing hydration guidance and habit recommendations around your routine.',
  'Polishing your premium AI nutrition blueprint for day one.',
];

export default function Onboarding() {
  const router = useRouter();
  const { user } = useUser();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [status, setStatus] = useState<'form' | 'generating' | 'summary'>('form');
  const [progress, setProgress] = useState(12);
  const [messageIndex, setMessageIndex] = useState(0);
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [gender, setGender] = useState('');
  const [goal, setGoal] = useState<'lose' | 'gain' | 'maintain'>('lose');
  const [workoutDays, setWorkoutDays] = useState(3);
  const [birthdate, setBirthdate] = useState('');
  const [height, setHeight] = useState<{ value: number; unit: 'feet' | 'cm' }>({ value: 0, unit: 'feet' });
  const [weight, setWeight] = useState<{ value: number; unit: 'kg' | 'lbs' }>({ value: 0, unit: 'kg' });

  const totalSteps = 5;
  const currentMessage = useMemo(() => LOADING_MESSAGES[messageIndex] || LOADING_MESSAGES[0], [messageIndex]);

  useEffect(() => {
    if (status !== 'generating') return;

    const messageInterval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length);
    }, 2400);

    const progressInterval = setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        return Math.min(current + Math.random() * 10, 92);
      });
    }, 700);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'summary') return;

    const timeout = setTimeout(() => {
      router.replace('/');
    }, 7000);

    return () => clearTimeout(timeout);
  }, [router, status]);

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    await generateAndFinalizeProfile();
  };

  const generateAndFinalizeProfile = async () => {
    setLoading(true);
    setGenerationError(null);
    setStatus('generating');
    setProgress(14);
    setMessageIndex(0);

    try {
      const profileUpdates = {
        gender,
        goal,
        workoutDays,
        birthdate,
        height,
        weight,
        onboardingCompleted: true,
      };

      const plan = await nutritionPlanService.generatePlan({
        gender,
        goal,
        workoutDays,
        birthdate,
        height,
        weight,
      });

      setProgress(97);

      const fullProfile = {
        ...profileUpdates,
        nutritionPlan: plan,
      };

      const savedProfile = await storageService.updateUserProfile(fullProfile);
      if (!savedProfile) {
        throw new Error('Unable to save the AI plan locally because the base user profile is missing.');
      }

      if (user?.id) {
        const userRef = doc(db, 'users', user.id);
        await setDoc(
          userRef,
          {
            ...fullProfile,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      setNutritionPlan(plan);
      setProgress(100);
      setShowConfetti(true);
      setStatus('summary');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Nutrition plan generation failed:', err);
      setGenerationError(err instanceof Error ? err.message : 'Something went wrong while generating your nutrition plan.');
      setStatus('form');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const isNextDisabled = () => {
    if (step === 1 && !gender) return true;
    if (step === 2 && !goal) return true;
    if (step === 4 && !birthdate) return true;
    if (step === 5 && (height.value === 0 || weight.value === 0)) return true;
    return false;
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <GenderStep value={gender} onChange={setGender} />;
      case 2:
        return <GoalStep value={goal} onChange={(val) => setGoal(val as 'lose' | 'gain' | 'maintain')} />;
      case 3:
        return <WorkoutStep value={workoutDays} onChange={setWorkoutDays} />;
      case 4:
        return <DOBStep value={birthdate} onChange={setBirthdate} />;
      case 5:
        return <MeasurementsStep height={height} setHeight={setHeight} weight={weight} setWeight={setWeight} />;
      default:
        return null;
    }
  };

  if (status === 'generating') {
    return <LoadingPlanScreen progress={progress} message={currentMessage} />;
  }

  if (status === 'summary' && nutritionPlan) {
    return (
      <View style={styles.container}>
        <PlanSummaryScreen plan={nutritionPlan} onContinue={() => router.replace('/')} />
        {showConfetti && (
          <ConfettiCannon count={220} origin={{ x: width / 2, y: -20 }} fallSpeed={2600} colors={[theme.accent, theme.accentPurple, theme.primary]} />
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.header}>
          <ProgressBar currentStep={step} totalSteps={totalSteps} />
        </View>

        <Animated.View
          key={step}
          entering={FadeInRight.duration(400).springify()}
          exiting={FadeOutLeft.duration(200)}
          style={styles.content}
        >
          {renderStep()}
        </Animated.View>

        {generationError && (
          <Animated.View entering={SlideInDown.duration(350)} style={[styles.errorBanner, { backgroundColor: theme.surface, borderColor: theme.error }]}>
            <Text style={[styles.errorTitle, { color: theme.error }]}>We couldn&apos;t finish your AI plan</Text>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>{generationError}</Text>
          </Animated.View>
        )}

        <View style={styles.footer}>
          {step > 1 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStep(step - 1);
              }}
            >
              <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}

          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: isNextDisabled() ? theme.surfaceBorder : theme.accent, shadowColor: theme.accent }]}
            disabled={isNextDisabled() || loading}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextButtonText, { color: isNextDisabled() ? theme.textSecondary : '#000' }]}>
              {loading ? 'Building Plan...' : step === totalSteps ? 'Finish' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flex: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '800',
  },
  errorBanner: {
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
