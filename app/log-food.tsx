import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, TextInput, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@clerk/clerk-expo';
import { Colors } from '../styles/colors';
import { useSafeBack } from '../hooks/useSafeBack';
import { logsService } from '../services/logsService';
import { useDate } from '../contexts/DateContext';

const parseFoodDescription = (description: string) => {
  const [servingPart = '1 serving', macroPart = ''] = description.split(' - ');

  const matchNumber = (pattern: RegExp) => {
    const match = macroPart.match(pattern);
    return match ? match[1] : '0';
  };

  return {
    serving: servingPart,
    calories: matchNumber(/Calories:\s*([\d.]+)kcal/i),
    protein: matchNumber(/Protein:\s*([\d.]+)g/i),
    carbs: matchNumber(/Carbs:\s*([\d.]+)g/i),
    fats: matchNumber(/Fat:\s*([\d.]+)g/i),
  };
};

const parseLeadingServingQuantity = (serving: string) => {
  const match = serving.match(/^\s*([\d.]+)/);
  return match ? Number(match[1]) || 1 : 1;
};

const formatMacro = (value: number) => value.toFixed(1).replace(/\.0$/, '');
const formatCalories = (value: number) => String(Math.round(value));

export default function LogFoodScreen() {
  const router = useRouter();
  const goBack = useSafeBack('/food-search');
  const { userId } = useAuth();
  const { selectedDate } = useDate();
  const params = useLocalSearchParams<{
    foodName?: string;
    brandName?: string;
    foodDescription?: string;
    foodType?: string;
  }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const initialValues = useMemo(
    () => parseFoodDescription(params.foodDescription || ''),
    [params.foodDescription]
  );
  const baseServingQuantity = useMemo(
    () => parseLeadingServingQuantity(initialValues.serving),
    [initialValues.serving]
  );
  const initialServingNumeric = useMemo(() => String(baseServingQuantity), [baseServingQuantity]);

  const [foodNameInput, setFoodNameInput] = useState(params.foodName || 'Selected Food');
  const [servingSize, setServingSize] = useState(initialServingNumeric);
  const [calories, setCalories] = useState(initialValues.calories);
  const [protein, setProtein] = useState(initialValues.protein);
  const [carbs, setCarbs] = useState(initialValues.carbs);
  const [fats, setFats] = useState(initialValues.fats);
  const [isSaving, setIsSaving] = useState(false);
  const [hasManualNutritionEdit, setHasManualNutritionEdit] = useState(false);
  const servingUnit = useMemo(
    () => initialValues.serving.replace(/^\s*[\d.]+\s*/, '').trim() || 'serving',
    [initialValues.serving]
  );

  const foodName = params.foodName || 'Selected Food';
  const brandName = params.brandName || '';
  const isAiEstimate = (params.foodType || '').toLowerCase().includes('ai');

  useEffect(() => {
    if (hasManualNutritionEdit) {
      return;
    }

    const nextServing = Number(servingSize);
    if (!Number.isFinite(nextServing) || nextServing <= 0) {
      return;
    }

    const scale = nextServing / baseServingQuantity;
    setCalories(formatCalories((Number(initialValues.calories) || 0) * scale));
    setProtein(formatMacro((Number(initialValues.protein) || 0) * scale));
    setCarbs(formatMacro((Number(initialValues.carbs) || 0) * scale));
    setFats(formatMacro((Number(initialValues.fats) || 0) * scale));
  }, [
    baseServingQuantity,
    hasManualNutritionEdit,
    initialValues.calories,
    initialValues.carbs,
    initialValues.fats,
    initialValues.protein,
    servingSize,
  ]);

  const handleMacroChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (value: string) => {
      if (!hasManualNutritionEdit) {
        setHasManualNutritionEdit(true);
      }

      setter(value);
    };

  const nutritionCards = [
    { label: 'Calories', value: calories, setter: handleMacroChange(setCalories), icon: 'flame', color: '#F97316', tint: '#FFF7ED', suffix: 'kcal', keyboardType: 'number-pad' as const },
    { label: 'Protein', value: protein, setter: handleMacroChange(setProtein), icon: 'barbell', color: '#DC2626', tint: '#FEF2F2', suffix: 'g', keyboardType: 'decimal-pad' as const },
    { label: 'Carbs', value: carbs, setter: handleMacroChange(setCarbs), icon: 'flash', color: '#2563EB', tint: '#EFF6FF', suffix: 'g', keyboardType: 'decimal-pad' as const },
    { label: 'Fats', value: fats, setter: handleMacroChange(setFats), icon: 'water', color: '#0891B2', tint: '#ECFEFF', suffix: 'g', keyboardType: 'decimal-pad' as const },
  ];

  const handleSave = async () => {
    if (!userId) {
      return;
    }

    setIsSaving(true);
    try {
      await logsService.addFoodLog(userId, selectedDate, {
        itemName: brandName ? `${foodNameInput} (${brandName})` : foodNameInput,
        servingSize: `${servingSize || '1'} ${servingUnit}`.trim(),
        calories: Number(calories) || 0,
        proteinGrams: Number(protein) || 0,
        carbsGrams: Number(carbs) || 0,
        fatsGrams: Number(fats) || 0,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.topBlob, { backgroundColor: theme.blobStart }]} />
      <View style={[styles.bottomBlob, { backgroundColor: theme.blobEnd }]} />

      <View style={styles.headerRow}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface }]} onPress={goBack} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Log Food</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(450)} style={styles.heroBlock}>
          {isAiEstimate ? (
            <View style={[styles.nameEditCard, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#F5EEFF' }]}>
                  <Ionicons name="create-outline" size={22} color="#7C3AED" />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Food Name</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                    Rename the AI result if you want a more accurate dish name before saving.
                  </Text>
                </View>
              </View>

              <View style={[styles.inputShell, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
                <TextInput
                  style={[styles.servingInput, { color: theme.text }]}
                  value={foodNameInput}
                  onChangeText={setFoodNameInput}
                  placeholder="Food name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>
          ) : (
            <Text style={[styles.foodTitle, { color: theme.text }]}>{foodName}</Text>
          )}
          {!!brandName && <Text style={[styles.brandText, { color: theme.textSecondary }]}>{brandName}</Text>}
          <Text style={[styles.foodTypeText, { color: theme.primary }]}>{params.foodType || 'Food entry'}</Text>
          {isAiEstimate && (
            <View style={styles.aiEstimateRow}>
              <Ionicons name="sparkles-outline" size={16} color="#7C3AED" />
              <Text style={styles.aiEstimateText}>AI estimate detected. Review and edit values before saving if needed.</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(450)} style={[styles.servingCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="restaurant-outline" size={22} color="#16A34A" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Serving Size</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Adjust quantity to auto-scale calories and macros.</Text>
            </View>
          </View>

          <View style={[styles.inputShell, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
            <TextInput
              style={[styles.servingInput, { color: theme.text }]}
              value={servingSize}
              onChangeText={setServingSize}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={[styles.servingUnitText, { color: theme.textSecondary }]}>{servingUnit}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={ZoomIn.delay(180).springify().damping(14)} style={[styles.calorieHeroCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="flame" size={24} color="#F97316" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Calories & Macros</Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>Fine-tune nutrition values before adding to your log.</Text>
            </View>
          </View>

          <View style={[styles.heroCaloriesPanel, { backgroundColor: '#F97316' }]}>
            <TextInput
              style={styles.heroCaloriesInput}
              value={calories}
              onChangeText={handleMacroChange(setCalories)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.7)"
            />
            <Text style={styles.heroCaloriesSuffix}>kcal</Text>
          </View>

          <View style={styles.macroGrid}>
            {nutritionCards.slice(1).map((card, index) => (
              <Animated.View
                key={card.label}
                entering={FadeInDown.delay(240 + index * 70).duration(420)}
                style={[styles.macroCard, { backgroundColor: theme.surface, borderColor: card.tint }]}
              >
                <View style={styles.macroCardTop}>
                  <View style={[styles.smallIconWrap, { backgroundColor: card.tint }]}>
                    <Ionicons name={card.icon as never} size={18} color={card.color} />
                  </View>
                  <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>{card.label}</Text>
                </View>

                <View style={[styles.inlineInputWrap, { backgroundColor: theme.background }]}>
                  <TextInput
                    style={[styles.inlineInput, { color: theme.text }]}
                    value={card.value}
                    onChangeText={card.setter}
                    keyboardType={card.keyboardType}
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                  />
                  <Text style={[styles.inlineSuffix, { color: card.color }]}>{card.suffix}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(420).duration(400)} style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: theme.primary }]}
          onPress={handleSave}
          activeOpacity={0.88}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.logButtonText}>Log Food</Text>
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
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
  topBlob: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.7,
  },
  bottomBlob: {
    position: 'absolute',
    bottom: 100,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.55,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 140,
  },
  heroBlock: {
    marginBottom: 24,
  },
  nameEditCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  foodTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  foodTypeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  aiEstimateRow: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#F5EEFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  aiEstimateText: {
    flex: 1,
    color: '#6D28D9',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  servingCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputShell: {
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  servingInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  servingUnitText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  calorieHeroCard: {
    borderRadius: 32,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 7,
  },
  heroCaloriesPanel: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 18,
  },
  heroCaloriesInput: {
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: -2,
    minWidth: 120,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  heroCaloriesSuffix: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroCard: {
    width: '48%',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
  },
  macroCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  smallIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  inlineInputWrap: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
  },
  inlineSuffix: {
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  logButton: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
