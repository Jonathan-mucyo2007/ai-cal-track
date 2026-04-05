import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, useColorScheme } from 'react-native';
import { Colors } from '../../styles/colors';

interface MeasurementsStepProps {
  height: { value: number; unit: 'feet' | 'cm' };
  setHeight: (val: { value: number; unit: 'feet' | 'cm' }) => void;
  weight: { value: number; unit: 'kg' | 'lbs' };
  setWeight: (val: { value: number; unit: 'kg' | 'lbs' }) => void;
}

export const MeasurementsStep = ({ height, setHeight, weight, setWeight }: MeasurementsStepProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Your physical stats</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>This ensures your macros are perfect</Text>

      {/* Height Module */}
      <View style={[styles.module, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
        <View style={styles.moduleHeader}>
          <Text style={[styles.moduleTitle, { color: theme.textSecondary }]}>HEIGHT</Text>
          <View style={[styles.unitToggle, { backgroundColor: theme.background }]}>
            <TouchableOpacity 
              onPress={() => setHeight({ ...height, unit: 'feet' })}
              style={[styles.unitBtn, height.unit === 'feet' && { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.unitText, height.unit === 'feet' ? { color: '#000' } : { color: theme.textSecondary }]}>ft</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setHeight({ ...height, unit: 'cm' })}
              style={[styles.unitBtn, height.unit === 'cm' && { backgroundColor: theme.accent }]}
            >
              <Text style={[styles.unitText, height.unit === 'cm' ? { color: '#000' } : { color: theme.textSecondary }]}>cm</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={[styles.inputLarge, { color: theme.text }]}
          keyboardType="numeric"
          maxLength={5}
          value={height.value ? height.value.toString() : ''}
          onChangeText={(text) => setHeight({ ...height, value: parseFloat(text) || 0 })}
          placeholder="0.0"
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      {/* Weight Module */}
      <View style={[styles.module, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
        <View style={styles.moduleHeader}>
          <Text style={[styles.moduleTitle, { color: theme.textSecondary }]}>WEIGHT</Text>
          <View style={[styles.unitToggle, { backgroundColor: theme.background }]}>
            <TouchableOpacity 
              onPress={() => setWeight({ ...weight, unit: 'lbs' })}
              style={[styles.unitBtn, weight.unit === 'lbs' && { backgroundColor: theme.accentPurple }]}
            >
              <Text style={[styles.unitText, weight.unit === 'lbs' ? { color: '#FFF' } : { color: theme.textSecondary }]}>lbs</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setWeight({ ...weight, unit: 'kg' })}
              style={[styles.unitBtn, weight.unit === 'kg' && { backgroundColor: theme.accentPurple }]}
            >
              <Text style={[styles.unitText, weight.unit === 'kg' ? { color: '#FFF' } : { color: theme.textSecondary }]}>kg</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={[styles.inputLarge, { color: theme.text }]}
          keyboardType="numeric"
          maxLength={5}
          value={weight.value ? weight.value.toString() : ''}
          onChangeText={(text) => setWeight({ ...weight, value: parseFloat(text) || 0 })}
          placeholder="0.0"
          placeholderTextColor={theme.textSecondary}
        />
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
  module: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    marginBottom: 24,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  unitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unitText: {
    fontWeight: '700',
    fontSize: 14,
  },
  inputLarge: {
    fontSize: 56,
    fontWeight: '800',
    textAlign: 'center',
  }
});
