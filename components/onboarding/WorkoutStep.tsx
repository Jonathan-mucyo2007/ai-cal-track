import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { Colors } from '../../styles/colors';
import * as Haptics from 'expo-haptics';

interface WorkoutStepProps {
  value: number;
  onChange: (val: number) => void;
}

export const WorkoutStep = ({ value, onChange }: WorkoutStepProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const options = [
    { value: 2, label: '2-3 days / week', recommended: false },
    { value: 3, label: '3-4 days / week', recommended: true },
    { value: 4, label: '4-5 days / week', recommended: true },
    { value: 5, label: '5-6 days / week', recommended: false },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>How often do you train?</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>This helps calculate your daily energy expenditure.</Text>

      <View style={styles.optionsContainer}>
        {options.map((opt) => {
          const isSelected = value === opt.value;

          return (
            <TouchableOpacity 
              key={opt.value}
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(opt.value);
              }}
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: isSelected ? theme.accent : theme.surfaceBorder },
                isSelected && { shadowColor: theme.accent, ...styles.cardSelected }
              ]}
            >
              <View style={styles.leftContent}>
                <View style={[styles.iconBox, { backgroundColor: isSelected ? theme.accent : theme.surfaceBorder }]}>
                  <CalendarDays size={24} color={isSelected ? '#000' : theme.icon} />
                </View>
                <Text style={[styles.cardLabel, { color: theme.text }]}>{opt.label}</Text>
              </View>
              
              {opt.recommended && (
                <View style={[styles.badge, { backgroundColor: theme.primaryLight }]}>
                  <Text style={styles.badgeText}>RECOMMENDED</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  cardSelected: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  }
});
