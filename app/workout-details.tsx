import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { UserProfileCache, storageService } from '../services/storageService';
import { workoutMathService } from '../services/workoutMathService';
import { useSafeBack } from '../hooks/useSafeBack';

const INTENSITIES = ['Low', 'Medium', 'High'];
const DURATIONS = ['15', '30', '60', '90'];
const MAX_DURATION_MINS = 300;

const sanitizeDurationInput = (value: string) => {
  const digitsOnly = value.replace(/[^\d]/g, '').slice(0, 3);
  if (!digitsOnly) return '';
  const parsed = Number(digitsOnly);
  return String(Math.min(parsed, MAX_DURATION_MINS));
};

export default function WorkoutDetails() {
  const router = useRouter();
  const goBack = useSafeBack('/log-exercise');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams();

  const title = params.title as string || 'Workout';
  const description = params.description as string || '';
  const icon = params.icon as any || 'barbell-outline';
  const themeColor = params.color as string || theme.primary;

  const [intensity, setIntensity] = useState('Medium');
  const [duration, setDuration] = useState('30');
  const [profile, setProfile] = useState<UserProfileCache | null>(null);
  const durationMins = Math.min(Math.max(parseInt(duration, 10) || 0, 0), MAX_DURATION_MINS);
  const estimatedCalories = workoutMathService.calculateCaloriesBurned(profile, title, intensity, durationMins || 1);

  React.useEffect(() => {
    storageService.loadUserProfile().then(p => setProfile(p));
  }, []);

  const handleIntensitySelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIntensity(value);
  };

  const handleDurationSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDuration(value);
  };

  const handleContinue = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (durationMins <= 0) {
      return;
    }
    const caloriesBurned = workoutMathService.calculateCaloriesBurned(profile, title, intensity, durationMins);
    
    router.push({
      pathname: '/workout-summary' as any,
      params: { 
        title, 
        caloriesBurned: caloriesBurned.toString(), 
        color: themeColor,
        duration: durationMins.toString(),
        intensity: intensity
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: theme.surface }]}
            onPress={goBack}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.titleSection}>
            <View style={[styles.iconLarge, { backgroundColor: themeColor + '15' }]}>
              <Ionicons name={icon} size={48} color={themeColor} />
            </View>
            <Text style={[styles.mainTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.subTitle, { color: theme.textSecondary }]}>{description}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="speedometer-outline" size={24} color={themeColor} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Intensity</Text>
            </View>
            
            <View style={[styles.sliderTrack, { backgroundColor: theme.background }]}>
              {/* Dynamic Sliding Thumb */}
              <Animated.View 
                style={[
                  styles.sliderThumb, 
                  { backgroundColor: themeColor },
                  useAnimatedStyle(() => ({
                    left: withSpring(`${(INTENSITIES.indexOf(intensity) * 100) / 3}%`, { damping: 20, stiffness: 200 }),
                  }))
                ]} 
              />

              {INTENSITIES.map((item) => {
                const isSelected = intensity === item;
                return (
                  <TouchableOpacity 
                    key={item}
                    style={styles.sliderNode}
                    onPress={() => handleIntensitySelect(item)}
                    activeOpacity={1}
                  >
                    <Text style={[
                      styles.sliderText, 
                      { color: isSelected ? '#FFF' : theme.textSecondary, fontWeight: isSelected ? '700' : '600' }
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="time-outline" size={24} color={themeColor} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Duration</Text>
            </View>
            
            <View style={styles.chipsContainer}>
              {DURATIONS.map((chip) => {
                const isSelected = duration === chip;
                return (
                  <TouchableOpacity
                    key={chip}
                    style={[
                      styles.chip,
                      isSelected ? { backgroundColor: themeColor, borderColor: themeColor } : { backgroundColor: theme.background, borderColor: theme.background }
                    ]}
                    onPress={() => handleDurationSelect(chip)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: isSelected ? '#FFF' : theme.text }
                    ]}>{chip} min</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.inputContainer, { backgroundColor: theme.background }]}>
              <TextInput 
                style={[styles.input, { color: theme.text }]}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                value={duration}
                onChangeText={(value) => setDuration(sanitizeDurationInput(value))}
                maxLength={3}
              />
              <Text style={[styles.inputSuffix, { color: theme.textSecondary }]}>mins</Text>
            </View>

            <View style={[styles.estimateBanner, { backgroundColor: theme.background }]}>
              <Text style={[styles.estimateTitle, { color: theme.text }]}>Estimated Burn</Text>
              <Text style={[styles.estimateValue, { color: themeColor }]}>
                {durationMins > 0 ? `${estimatedCalories} kcal` : 'Add duration'}
              </Text>
              <Text style={[styles.estimateSubtitle, { color: theme.textSecondary }]}>
                Based on your saved body weight, workout type, intensity, and duration.
              </Text>
            </View>
          </Animated.View>

        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: theme.primary }]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={durationMins <= 0}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  iconLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sliderTrack: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    position: 'relative',
  },
  sliderThumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '33.33%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sliderNode: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sliderText: {
    fontSize: 14,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 60,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  inputSuffix: {
    fontSize: 16,
    fontWeight: '600',
  },
  estimateBanner: {
    marginTop: 18,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  estimateTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  estimateValue: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  estimateSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  }
});
