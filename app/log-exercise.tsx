import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeBack } from '../hooks/useSafeBack';

const LogExercise = () => {
  const router = useRouter();
  const goBack = useSafeBack('/');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const handleCardPress = (opt: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (opt.id === 'manual') {
      router.push('/manual-calorie-log');
    } else {
      router.push({
        pathname: '/workout-details',
        params: { title: opt.title, description: opt.description, icon: opt.icon, color: opt.color }
      });
    }
  };

  const exerciseOptions = [
    {
      id: 'run',
      title: 'Run',
      description: 'Running, Walking, Cycling etc',
      icon: 'walk-outline',
      delay: 100,
      color: '#34d399',
      bgColor: 'rgba(52, 211, 153, 0.1)'
    },
    {
      id: 'weight',
      title: 'Weight Lifting',
      description: 'Gym, Machine etc',
      icon: 'barbell-outline',
      delay: 200,
      color: '#38bdf8',
      bgColor: 'rgba(56, 189, 248, 0.1)'
    },
    {
      id: 'manual',
      title: 'Manual',
      description: 'Enter calories Burn Manually',
      icon: 'flame-outline',
      delay: 300,
      color: '#fbbf24',
      bgColor: 'rgba(251, 191, 36, 0.1)'
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surface }]}
          onPress={goBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Log Exercise</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.cardsContainer}>
          {exerciseOptions.map((opt) => (
            <Animated.View 
              key={opt.id} 
              entering={SlideInRight.delay(opt.delay).springify().damping(18).stiffness(150)}
            >
              <TouchableOpacity 
                activeOpacity={0.85} 
                style={[styles.card, { backgroundColor: theme.surface }]}
                onPress={() => handleCardPress(opt)}
              >
                <View style={[styles.iconContainer, { backgroundColor: opt.bgColor }]}>
                  <Ionicons name={opt.icon as any} size={32} color={opt.color} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{opt.title}</Text>
                  <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>{opt.description}</Text>
                </View>
                <View style={styles.chevron}>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
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
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    marginLeft: 12,
    opacity: 0.5,
  }
});

export default LogExercise;
