import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, withSpring, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@clerk/clerk-expo';
import { logsService } from '../services/logsService';
import { useDate } from '../contexts/DateContext';
import { useSafeBack } from '../hooks/useSafeBack';

export default function WorkoutSummary() {
  const router = useRouter();
  const goBack = useSafeBack('/');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams();
  const { userId } = useAuth();
  const { selectedDate } = useDate();

  const title = params.title as string || 'Workout';
  const caloriesBurned = parseInt(params.caloriesBurned as string || '0', 10);
  const themeColor = params.color as string || '#FF4500'; 
  const duration = parseInt(params.duration as string || '0', 10);
  const intensity = params.intensity as string || '';

  const scale = useSharedValue(0.8);
  const [isLogging, setIsLogging] = React.useState(false);
  
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withSpring(1, { damping: 10, stiffness: 80 });
  }, [scale]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handleLog = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (userId) {
      setIsLogging(true);
      await logsService.addExerciseLog(userId, selectedDate, title, caloriesBurned, duration, intensity);
      setIsLogging(false);
    }
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surface }]}
          onPress={goBack}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Animated.View entering={FadeInUp.delay(100).springify()} style={[styles.iconContainer, animatedIconStyle]}>
          <View style={[styles.iconInner, { backgroundColor: themeColor + '20' }]}>
            <Ionicons name="flame" size={88} color={themeColor} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.textSecondary }]}>Your Workout Burned</Text>
          <View style={styles.calorieRow}>
            <Text style={[styles.calories, { color: theme.text }]}>{caloriesBurned}</Text>
            <Text style={[styles.unit, { color: themeColor }]}>kcal</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(500).springify()} style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: themeColor }]}
          onPress={handleLog}
          activeOpacity={0.8}
          disabled={isLogging}
        >
          {isLogging ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.buttonText}>Log Workout</Text>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
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
    justifyContent: 'flex-end',
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  calories: {
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -2,
  },
  unit: {
    fontSize: 24,
    fontWeight: '700',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  }
});
