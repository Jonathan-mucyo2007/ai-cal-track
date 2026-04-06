import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Flame, Coffee, Activity, User } from 'lucide-react-native';
import { HalfProgress } from '../HalfProgress';
import { Colors } from '../../styles/colors';
import Animated, { FadeInUp, SlideInDown } from 'react-native-reanimated';

type Props = {
  remainingCalories: number;
  totalCalories: number;
  consumedCalories: number;
  burnedCalories?: number;
  macros: {
    carbsLeft: number;
    proteinLeft: number;
    fatsLeft: number;
  };
  onEditPress?: () => void;
};

export const CaloriesCard = ({
  remainingCalories,
  totalCalories,
  consumedCalories,
  burnedCalories = 0,
  macros,
  onEditPress
}: Props) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const safeConsumedCalories = Math.max(0, consumedCalories);
  const safeRemainingCalories = Math.max(0, remainingCalories);
  const progress = totalCalories > 0 ? Math.min(safeConsumedCalories / totalCalories, 1) : 0;
  const progressPercent = Math.round(progress * 100);
  const netCalories = Math.max(0, safeConsumedCalories - Math.max(0, burnedCalories));

  return (
    <Animated.View entering={FadeInUp.duration(600).springify()} style={[styles.cardContainer, { backgroundColor: theme.surface }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Calories</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
          <Text style={[styles.editButtonText, { color: theme.textSecondary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressMetaRow}>
        <View style={[styles.progressBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(41,191,80,0.18)' : '#E9FBEF' }]}>
          <Text style={[styles.progressBadgeText, { color: theme.primary }]}>{progressPercent}% of goal</Text>
        </View>
        <Text style={[styles.progressHelperText, { color: theme.textSecondary }]}>
          Food logs reduce your daily remaining calories
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <HalfProgress 
          progress={progress} 
          size={300} 
          value={safeRemainingCalories}
          label="Remaining"
          activeColor={theme.primary}
          inactiveColor={colorScheme === 'dark' ? "rgba(255,255,255,0.05)" : "#F0Fdf4"}
          textColor={theme.text}
        />
      </View>

      <View style={styles.dailyTotalsRow}>
        <View style={[styles.dailyStatCard, { backgroundColor: theme.background }]}>
          <View style={[styles.dailyStatIcon, { backgroundColor: 'rgba(249, 115, 22, 0.14)' }]}>
            <Flame size={18} color="#F97316" />
          </View>
          <Text style={[styles.dailyStatValue, { color: theme.text }]}>{safeConsumedCalories}</Text>
          <Text style={[styles.dailyStatLabel, { color: theme.textSecondary }]}>Consumed</Text>
        </View>

        <View style={[styles.dailyStatCard, { backgroundColor: theme.background }]}>
          <View style={[styles.dailyStatIcon, { backgroundColor: 'rgba(56, 189, 248, 0.14)' }]}>
            <Activity size={18} color="#38BDF8" />
          </View>
          <Text style={[styles.dailyStatValue, { color: theme.text }]}>{Math.max(0, burnedCalories)}</Text>
          <Text style={[styles.dailyStatLabel, { color: theme.textSecondary }]}>Burned</Text>
        </View>

        <View style={[styles.dailyStatCard, styles.netStatCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(41,191,80,0.16)' : '#EEFDF3' }]}>
          <View style={[styles.dailyStatIcon, { backgroundColor: 'rgba(41, 191, 80, 0.16)' }]}>
            <User size={18} color={theme.primary} />
          </View>
          <Text style={[styles.dailyStatValue, { color: theme.primary }]}>{netCalories}</Text>
          <Text style={[styles.dailyStatLabel, { color: theme.textSecondary }]}>Net Intake</Text>
        </View>
      </View>

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
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  progressBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  progressBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressHelperText: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  dailyTotalsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  dailyStatCard: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netStatCard: {
    borderWidth: 1,
    borderColor: 'rgba(41, 191, 80, 0.14)',
  },
  dailyStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dailyStatValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  dailyStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
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
