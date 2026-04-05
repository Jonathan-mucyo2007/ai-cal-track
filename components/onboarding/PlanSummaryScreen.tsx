import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Droplets, Flame, Beef, Wheat, Nut } from 'lucide-react-native';
import { Colors } from '../../styles/colors';
import { NutritionPlanResult } from '../../services/nutritionMathService';

interface PlanSummaryScreenProps {
  plan: NutritionPlanResult;
  onContinue: () => void;
}

const SummaryCard = ({
  label,
  value,
  accentColor,
  icon,
  backgroundColor,
  textColor,
  secondaryTextColor,
}: {
  label: string;
  value: string;
  accentColor: string;
  icon: React.ReactNode;
  backgroundColor: string;
  textColor: string;
  secondaryTextColor: string;
}) => (
  <View style={[styles.metricCard, { backgroundColor, borderColor: `${accentColor}40` }]}>
    <View style={[styles.metricIcon, { backgroundColor: `${accentColor}18` }]}>{icon}</View>
    <Text style={[styles.metricLabel, { color: secondaryTextColor }]}>{label}</Text>
    <Text style={[styles.metricValue, { color: textColor }]}>{value}</Text>
  </View>
);

export const PlanSummaryScreen = ({ plan, onContinue }: PlanSummaryScreenProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const coachLabel =
    plan.coachSource === 'backend'
      ? 'AI Coach via Backend'
      : plan.coachSource === 'openai'
        ? 'AI Coach by OpenAI'
        : plan.coachSource === 'gemini'
          ? 'AI Coach by Gemini'
          : plan.coachSource === 'anthropic'
            ? 'AI Coach by Anthropic'
            : 'Smart Backup Coach';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)} style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
          <Text style={[styles.heroKicker, { color: theme.accentPurple }]}>YOUR AI COACH IS READY</Text>
          <Text style={[styles.heroTitle, { color: theme.text }]}>You just unlocked a smart daily nutrition blueprint.</Text>
          <Text style={[styles.heroSummary, { color: theme.textSecondary }]}>{plan.summary}</Text>
          <View style={[styles.sourceBadge, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
            <Text style={[styles.sourceBadgeText, { color: theme.text }]}>{coachLabel}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.metricGrid}>
          <SummaryCard
            label="Daily Calories"
            value={`${plan.dailyCalories} kcal`}
            accentColor={theme.accent}
            icon={<Flame size={24} color={theme.accent} />}
            backgroundColor={theme.surface}
            textColor={theme.text}
            secondaryTextColor={theme.textSecondary}
          />
          <SummaryCard
            label="Protein"
            value={`${plan.macros.proteinGrams}g`}
            accentColor={theme.primary}
            icon={<Beef size={24} color={theme.primary} />}
            backgroundColor={theme.surface}
            textColor={theme.text}
            secondaryTextColor={theme.textSecondary}
          />
          <SummaryCard
            label="Carbs"
            value={`${plan.macros.carbsGrams}g`}
            accentColor={theme.warning}
            icon={<Wheat size={24} color={theme.warning} />}
            backgroundColor={theme.surface}
            textColor={theme.text}
            secondaryTextColor={theme.textSecondary}
          />
          <SummaryCard
            label="Fats"
            value={`${plan.macros.fatsGrams}g`}
            accentColor={theme.accentPurple}
            icon={<Nut size={24} color={theme.accentPurple} />}
            backgroundColor={theme.surface}
            textColor={theme.text}
            secondaryTextColor={theme.textSecondary}
          />
          <View style={[styles.waterCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
            <View style={[styles.waterIconWrap, { backgroundColor: `${theme.accent}16` }]}>
              <Droplets size={28} color={theme.accent} />
            </View>
            <Text style={[styles.waterLabel, { color: theme.textSecondary }]}>Daily Water Target</Text>
            <Text style={[styles.waterValue, { color: theme.text }]}>{plan.dailyWaterLiters.toFixed(1)} L</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(500)} style={[styles.recommendationsCard, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}>
          <Text style={[styles.recommendationsTitle, { color: theme.text }]}>Personalized recommendations</Text>
          {plan.recommendations.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.recommendationRow}>
              <View style={[styles.recommendationDot, { backgroundColor: theme.accent }]} />
              <Text style={[styles.recommendationText, { color: theme.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(320).duration(500)} style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={[styles.ctaButton, { backgroundColor: theme.accent }]} onPress={onContinue} activeOpacity={0.9}>
          <Text style={styles.ctaText}>Enter My Dashboard</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 150,
  },
  heroCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroSummary: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  sourceBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  metricGrid: {
    gap: 14,
  },
  metricCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
  },
  metricIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  waterCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    marginTop: 2,
  },
  waterIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  waterValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  recommendationsCard: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    marginTop: 20,
  },
  recommendationsTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
    marginRight: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 23,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  ctaButton: {
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaText: {
    color: '#000',
    fontSize: 17,
    fontWeight: '800',
  },
});
