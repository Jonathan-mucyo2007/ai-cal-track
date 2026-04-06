import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useUser } from '@clerk/clerk-expo';
import { useDate } from '../contexts/DateContext';
import { logsService } from '../services/logsService';
import { useSafeBack } from '../hooks/useSafeBack';

export default function ManualCalorieLog() {
  const router = useRouter();
  const goBack = useSafeBack('/log-exercise');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [calories, setCalories] = useState('');
  const { user } = useUser();
  const { selectedDate } = useDate();

  const handleLog = async () => {
    if (!calories) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (user?.id) {
      try {
        await logsService.addExerciseLog(
          user.id,
          selectedDate,
          'Manual Burn',
          parseInt(calories, 10)
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Calories Logged!",
          `Successfully logged ${calories} kcal.`,
          [{ text: "Awesome!", onPress: () => router.replace('/(tabs)') }]
        );
      } catch {
        Alert.alert("Error", "Could not log calories. Please try again.");
      }
    }
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

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View entering={ZoomIn.delay(100).springify().damping(15)} style={styles.heroSection}>
            <View style={styles.fireRingOuter}>
              <View style={styles.fireRingInner}>
                <Ionicons name="flame" size={80} color="#f97316" />
              </View>
            </View>
            <Text style={[styles.heroTitle, { color: theme.text }]}>Manual Log</Text>
            <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>Enter the exact calories you burned</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
            <TextInput 
              style={[styles.metricInput, { color: theme.text }]}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              value={calories}
              onChangeText={setCalories}
              maxLength={4}
              autoFocus={true}
            />
            <Text style={[styles.metricSuffix, { color: theme.primary }]}>kcal</Text>
          </Animated.View>

        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: '#f97316' }]}
            onPress={handleLog}
            activeOpacity={0.8}
            disabled={!calories}
          >
            <Text style={styles.continueButtonText}>Log Burned Calories</Text>
            <Ionicons name="flame" size={20} color="#FFF" />
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
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 48,
  },
  fireRingOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  fireRingInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 32,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
  metricInput: {
    fontSize: 72,
    fontWeight: '900',
    textAlign: 'center',
    marginRight: 12,
  },
  metricSuffix: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
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
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  }
});
