import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { User, Activity, MoreHorizontal } from 'lucide-react-native';
import { Colors } from '../../styles/colors';
import * as Haptics from 'expo-haptics';

interface GenderStepProps {
  value: string;
  onChange: (val: string) => void;
}

export const GenderStep = ({ value, onChange }: GenderStepProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const options = [
    { id: 'male', label: 'Male', icon: User },
    { id: 'female', label: 'Female', icon: Activity },
    { id: 'non-binary', label: 'Non-binary', icon: MoreHorizontal },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Tell us about yourself</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>This helps us personalize your calorie targets</Text>

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
                { backgroundColor: isSelected ? theme.accent : theme.surface },
                isSelected ? styles.cardSelected : { borderColor: theme.surfaceBorder }
              ]}
            >
              <Icon 
                size={48} 
                color={isSelected ? '#000' : theme.icon} 
                strokeWidth={1.5}
                style={{ marginBottom: 16 }}
              />
              <Text 
                style={[
                  styles.cardLabel, 
                  { color: isSelected ? '#000' : theme.text, fontWeight: isSelected ? '700' : '600' }
                ]}
              >
                {opt.label}
              </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 24,
    borderWidth: 1,
  },
  cardSelected: {
    borderWidth: 0,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    shadowColor: '#00F5D4',
  },
  cardLabel: {
    fontSize: 18,
  }
});
