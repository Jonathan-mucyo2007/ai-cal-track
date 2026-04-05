import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Flame, Dumbbell, Scale } from 'lucide-react-native';
import { Colors } from '../../styles/colors';
import * as Haptics from 'expo-haptics';

interface GoalStepProps {
  value: string;
  onChange: (val: string) => void;
}

export const GoalStep = ({ value, onChange }: GoalStepProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const options = [
    { id: 'lose', label: 'Lose Weight', desc: 'Burn fat and get leaner', icon: Flame, color: '#EF4444' },
    { id: 'gain', label: 'Gain Muscle', desc: 'Build size and strength', icon: Dumbbell, color: theme.accent },
    { id: 'maintain', label: 'Maintain', desc: 'Body recomposition', icon: Scale, color: theme.accentPurple },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>What&apos;s your main goal?</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>We&apos;ll adjust your macros accordingly</Text>

      <View style={styles.optionsContainer}>
        {options.map((opt) => {
          const isSelected = value === opt.id;
          const Icon = opt.icon;

          return (
            <TouchableOpacity 
              key={opt.id}
              activeOpacity={0.9}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(opt.id);
              }}
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: isSelected ? opt.color : theme.surfaceBorder },
                isSelected && { shadowColor: opt.color, ...styles.cardSelected }
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: `${opt.color}20` }]}>
                <Icon size={32} color={opt.color} strokeWidth={2} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.cardLabel, { color: theme.text }]}>{opt.label}</Text>
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>{opt.desc}</Text>
              </View>
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
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  cardSelected: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
  }
});
