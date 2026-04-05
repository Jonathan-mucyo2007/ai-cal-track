import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Flame, Coffee, Activity, User } from 'lucide-react-native';
import { HalfProgress } from '../HalfProgress';
import { Colors } from '../../styles/colors';
import Animated, { FadeInUp, SlideInDown } from 'react-native-reanimated';

// Mock types. In reality, pull this from user state or a context
type Props = {
  remainingCalories: number;
  totalCalories: number;
  macros: {
    carbsLeft: number;
    proteinLeft: number;
    fatsLeft: number;
  };
  onEditPress?: () => void;
};

export const CaloriesCard = ({ remainingCalories, totalCalories, macros, onEditPress }: Props) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  // Calculate progress safely: 0 when no calories consumed, approaches 1 as calories are consumed
  const consumedCalories = totalCalories - remainingCalories;
  const progress = totalCalories > 0 ? consumedCalories / totalCalories : 0;

  return (
    <Animated.View entering={FadeInUp.duration(600).springify()} style={[styles.cardContainer, { backgroundColor: theme.surface }]}>
      
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Calories</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
          <Text style={[styles.editButtonText, { color: theme.textSecondary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Chart */}
      <View style={styles.chartContainer}>
        <HalfProgress 
          progress={progress} 
          size={300} 
          value={remainingCalories} 
          label="Remaining"
          activeColor={theme.primary}
          inactiveColor={colorScheme === 'dark' ? "rgba(255,255,255,0.05)" : "#F0Fdf4"} // F0Fdf4 is a very light green hue for light mode. Actually image shows E8F5E9 which is light green.
          textColor={theme.text}
        />
      </View>

      {/* Macros Row */}
      <View style={styles.macrosContainer}>
        <Animated.View entering={SlideInDown.delay(200).springify()} style={[styles.macroItem, { backgroundColor: theme.background }]}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
             <Coffee size={20} color="#F97316" />
          </View>
          <Text style={[styles.macroValue, { color: theme.text }]}>{macros.carbsLeft}g</Text>
          <Text style={styles.macroLabel}>Carbs Left</Text>
        </Animated.View>

        <Animated.View entering={SlideInDown.delay(300).springify()} style={[styles.macroItem, { backgroundColor: theme.background }]}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
             <Flame size={20} color="#38BDF8" /> 
          </View>
          <Text style={[styles.macroValue, { color: theme.text }]}>{macros.proteinLeft}g</Text>
          <Text style={styles.macroLabel}>Protein Left</Text>
        </Animated.View>

        <Animated.View entering={SlideInDown.delay(400).springify()} style={[styles.macroItem, { backgroundColor: theme.background }]}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(41, 191, 80, 0.15)' }]}>
             <User size={20} color={theme.primary} />
          </View>
          <Text style={[styles.macroValue, { color: theme.text }]}>{macros.fatsLeft}g</Text>
          <Text style={styles.macroLabel}>Fats Left</Text>
        </Animated.View>
      </View>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  editButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // HalfProgress handles scaling naturally, just ensure enough vertical space
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  macroItem: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  }
});
