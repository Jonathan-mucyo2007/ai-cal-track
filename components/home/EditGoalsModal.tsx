import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, useColorScheme, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Target, Flame, Coffee, User, X } from 'lucide-react-native';
import { Colors } from '../../styles/colors';
import * as Haptics from 'expo-haptics';

interface EditGoalsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (goals: { dailyCalories: number, proteinGrams: number, carbsGrams: number, fatsGrams: number, dailyWaterLiters: number }) => void;
  initialValues: {
    dailyCalories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
    dailyWaterLiters: number;
  };
}

export const EditGoalsModal = ({ visible, onClose, onSave, initialValues }: EditGoalsModalProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [calories, setCalories] = useState(String(initialValues.dailyCalories));
  const [protein, setProtein] = useState(String(initialValues.proteinGrams));
  const [carbs, setCarbs] = useState(String(initialValues.carbsGrams));
  const [fats, setFats] = useState(String(initialValues.fatsGrams));
  const [water, setWater] = useState(String(initialValues.dailyWaterLiters));

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setCalories(String(initialValues.dailyCalories));
      setProtein(String(initialValues.proteinGrams));
      setCarbs(String(initialValues.carbsGrams));
      setFats(String(initialValues.fatsGrams));
      setWater(String(initialValues.dailyWaterLiters));
    }
  }, [visible, initialValues]);

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({
      dailyCalories: parseInt(calories) || 0,
      proteinGrams: parseInt(protein) || 0,
      carbsGrams: parseInt(carbs) || 0,
      fatsGrams: parseInt(fats) || 0,
      dailyWaterLiters: parseFloat(water) || 0,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Edit Targets</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color={theme.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            
            {/* Calories Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Target size={18} color={theme.primary} />
                <Text style={[styles.label, { color: theme.text }]}>Daily Calories</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                keyboardType="numeric"
                value={calories}
                onChangeText={setCalories}
                placeholder="2000"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            {/* Protein Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Flame size={18} color="#38BDF8" />
                <Text style={[styles.label, { color: theme.text }]}>Protein (g)</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                keyboardType="numeric"
                value={protein}
                onChangeText={setProtein}
                placeholder="150"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            {/* Carbs Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Coffee size={18} color="#F97316" />
                <Text style={[styles.label, { color: theme.text }]}>Carbs (g)</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                keyboardType="numeric"
                value={carbs}
                onChangeText={setCarbs}
                placeholder="200"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            {/* Fats Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <User size={18} color="#29BF50" />
                <Text style={[styles.label, { color: theme.text }]}>Fats (g)</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                keyboardType="numeric"
                value={fats}
                onChangeText={setFats}
                placeholder="70"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            {/* Water Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Target size={18} color="#3B82F6" />
                <Text style={[styles.label, { color: theme.text }]}>Daily Water (Liters)</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                keyboardType="numeric"
                value={water}
                onChangeText={setWater}
                placeholder="3.2"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  formContainer: {
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#29BF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  }
});
