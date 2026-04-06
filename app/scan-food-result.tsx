import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../styles/colors';
import { useSafeBack } from '../hooks/useSafeBack';
import { foodScanService } from '../services/foodScanService';

export default function ScanFoodResultScreen() {
  const router = useRouter();
  const goBack = useSafeBack('/scan-food-insights');
  const params = useLocalSearchParams<{ scanId?: string }>();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const scanId = params.scanId || '';
  const capture = useMemo(() => (scanId ? foodScanService.getCapture(scanId) : null), [scanId]);
  const result = useMemo(() => (scanId ? foodScanService.getResult(scanId) : null), [scanId]);

  const description = result
    ? `${result.estimatedServing} - Calories: ${result.caloriesKcal}kcal | Fat: ${result.fatsGrams}g | Carbs: ${result.carbsGrams}g | Protein: ${result.proteinGrams}g`
    : '';
  const confidenceTone =
    result?.confidence === 'high'
      ? { background: colorScheme === 'dark' ? 'rgba(41,191,80,0.16)' : '#EEFDF3', text: theme.primary }
      : result?.confidence === 'low'
        ? { background: colorScheme === 'dark' ? 'rgba(248,113,113,0.16)' : '#FEF2F2', text: '#DC2626' }
        : { background: colorScheme === 'dark' ? 'rgba(251,191,36,0.16)' : '#FFFBEB', text: '#D97706' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.topGlow, { backgroundColor: theme.blobStart }]} />
      <View style={[styles.bottomGlow, { backgroundColor: theme.blobEnd }]} />

      <View style={styles.headerRow}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface }]} onPress={goBack} activeOpacity={0.86}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>AI Food Result</Text>
      </View>

      <Animated.ScrollView entering={FadeInUp.duration(420)} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.delay(80).duration(420)} style={[styles.heroCard, { backgroundColor: theme.surface }]}>
          <View style={styles.heroTop}>
            <View style={styles.titleWrap}>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>Gemini Food Vision</Text>
              <Text style={[styles.dishName, { color: theme.text }]}>{result?.dishName || 'Food result unavailable'}</Text>
              <Text style={[styles.servingText, { color: theme.textSecondary }]}>{result?.estimatedServing || 'No serving estimate'}</Text>
            </View>
            <View style={[styles.confidenceBadge, { backgroundColor: confidenceTone.background }]}>
              <Text style={[styles.confidenceText, { color: confidenceTone.text }]}>{result?.confidence || 'n/a'} confidence</Text>
            </View>
          </View>

          <View style={[styles.imageShell, { backgroundColor: theme.background, borderColor: theme.surfaceBorder }]}>
            {capture?.imageUri ? (
              <Image source={{ uri: capture.imageUri }} style={styles.previewImage} contentFit="cover" transition={250} />
            ) : (
              <View style={styles.imageFallback}>
                <Ionicons name="image-outline" size={34} color={theme.textSecondary} />
              </View>
            )}
          </View>

          <View style={[styles.caloriePanel, { backgroundColor: '#F97316' }]}>
            <Text style={styles.calorieValue}>{result?.caloriesKcal ?? 0}</Text>
            <Text style={styles.calorieLabel}>kcal estimated</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(420)} style={styles.macroGrid}>
          {[
            { label: 'Protein', value: result?.proteinGrams ?? 0, icon: 'barbell', tint: '#FEF2F2', color: '#DC2626' },
            { label: 'Carbs', value: result?.carbsGrams ?? 0, icon: 'flash', tint: '#EFF6FF', color: '#2563EB' },
            { label: 'Fats', value: result?.fatsGrams ?? 0, icon: 'water', tint: '#ECFEFF', color: '#0891B2' },
          ].map((item) => (
            <View key={item.label} style={[styles.macroCard, { backgroundColor: theme.surface }]}>
              <View style={[styles.macroIconWrap, { backgroundColor: item.tint }]}>
                <Ionicons name={item.icon as never} size={20} color={item.color} />
              </View>
              <Text style={[styles.macroValue, { color: theme.text }]}>{item.value}g</Text>
              <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(420)} style={[styles.reasonCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.disclaimerBanner, { backgroundColor: colorScheme === 'dark' ? 'rgba(107,70,193,0.14)' : '#F5EEFF' }]}>
            <Ionicons name="sparkles-outline" size={18} color="#7C3AED" />
            <Text style={styles.disclaimerText}>
              Premium AI estimate. Great for speed and convenience, but you should still review before logging.
            </Text>
          </View>
          <Text style={[styles.reasonTitle, { color: theme.text }]}>AI reasoning</Text>
          <Text style={[styles.reasonText, { color: theme.textSecondary }]}>
            {result?.reasoning || 'No additional reasoning was returned by the AI model.'}
          </Text>
        </Animated.View>
      </Animated.ScrollView>

      <Animated.View entering={FadeInDown.delay(280).duration(420)} style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
          activeOpacity={0.88}
          onPress={() =>
            router.push({
              pathname: '/food-search',
              params: { query: result?.dishName || '' },
            })
          }
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Search Database Instead</Text>
          <Ionicons name="search-outline" size={20} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.88}
          onPress={() =>
            router.push({
              pathname: '/log-food',
              params: {
                foodName: result?.dishName || 'Detected Food',
                foodDescription: description,
                foodType: 'AI scan',
              },
            })
          }
        >
          <Text style={styles.primaryButtonText}>Log This Food</Text>
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGlow: {
    position: 'absolute',
    top: -70,
    left: -40,
    width: 210,
    height: 210,
    borderRadius: 105,
    opacity: 0.72,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 80,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.56,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 14,
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
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 140,
    gap: 18,
  },
  heroCard: {
    borderRadius: 30,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 7,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  titleWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dishName: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  servingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confidenceBadge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  imageShell: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    aspectRatio: 1,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriePanel: {
    borderRadius: 26,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieValue: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -1.8,
  },
  calorieLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 5,
  },
  macroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  macroValue: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  reasonCard: {
    borderRadius: 28,
    padding: 20,
  },
  disclaimerBanner: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  disclaimerText: {
    flex: 1,
    color: '#6D28D9',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  reasonTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  reasonText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    gap: 10,
  },
  secondaryButton: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButton: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
