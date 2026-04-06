import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useUser } from '@clerk/clerk-expo';
import { RulerPicker } from 'react-native-ruler-picker';
import { useRouter } from 'expo-router';
import { Colors } from '../styles/colors';
import { storageService } from '../services/storageService';
import { userProfileService } from '../services/userProfileService';
import { useSafeBack } from '../hooks/useSafeBack';

const poundsToKg = (pounds: number) => pounds * 0.453592;

const formatWeightDate = (value?: string) => {
  if (!value) return 'No recent update';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No recent update';

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function UpdateWeightScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { user } = useUser();
  const router = useRouter();
  const goBack = useSafeBack('/(tabs)/analytics');

  const [selectedWeight, setSelectedWeight] = useState(70);
  const [defaultWeight, setDefaultWeight] = useState(70);
  const [savedWeightDate, setSavedWeightDate] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    storageService.loadUserProfile().then((storedProfile) => {
      if (!isMounted) return;

      const currentWeight = storedProfile?.weight?.value;
      const currentUnit = storedProfile?.weight?.unit;
      const kilograms =
        currentWeight && currentUnit === 'lbs' ? poundsToKg(currentWeight) : currentWeight ?? 70;
      const roundedKilograms = Number(kilograms.toFixed(1));

      setSelectedWeight(roundedKilograms);
      setDefaultWeight(roundedKilograms);
      setSavedWeightDate(storedProfile?.weightUpdatedAt);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const rulerKey = useMemo(() => `weight-ruler-${defaultWeight.toFixed(1)}`, [defaultWeight]);
  const lastUpdatedLabel = useMemo(() => formatWeightDate(savedWeightDate), [savedWeightDate]);

  const handleSave = async () => {
    if (!user?.id || isSaving) return;

    try {
      setIsSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await userProfileService.updateWeight(user.id, selectedWeight);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/analytics');
    } catch (error) {
      console.error('Failed to update weight', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Update Weight</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isReady ? (
          <View style={styles.content}>
            <Animated.View
              entering={ZoomIn.duration(380)}
              style={[
                styles.heroCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder,
                  shadowColor: colorScheme === 'dark' ? '#000' : '#0F172A',
                },
              ]}
            >
              <View style={[styles.heroBadge, { backgroundColor: colorScheme === 'dark' ? 'rgba(41,191,80,0.14)' : '#EAFBF0' }]}>
                <Ionicons name="barbell-outline" size={18} color={theme.primary} />
                <Text style={[styles.heroBadgeText, { color: theme.primary }]}>Body Metric</Text>
              </View>

              <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>Current weight</Text>
              <View style={styles.weightDisplay}>
                <Text style={[styles.weightValue, { color: theme.text }]}>{selectedWeight.toFixed(1)}</Text>
                <Text style={[styles.weightUnit, { color: theme.textSecondary }]}>kg</Text>
              </View>

              <Text style={[styles.supportingText, { color: theme.textSecondary }]}>
                Fine-tune your latest weigh-in and keep your profile measurements accurate.
              </Text>

              <View style={styles.metaRow}>
                <View style={[styles.metaCard, { backgroundColor: colorScheme === 'dark' ? '#162033' : '#F8FAFC' }]}>
                  <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Saved default</Text>
                  <Text style={[styles.metaValue, { color: theme.text }]}>{defaultWeight.toFixed(1)} kg</Text>
                </View>
                <View style={[styles.metaCard, { backgroundColor: colorScheme === 'dark' ? '#162033' : '#F8FAFC' }]}>
                  <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Last updated</Text>
                  <Text style={[styles.metaValue, { color: theme.text }]}>{lastUpdatedLabel}</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(100).duration(400)}
              style={[
                styles.pickerCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder,
                  shadowColor: colorScheme === 'dark' ? '#000' : '#0F172A',
                },
              ]}
            >
              <Text style={[styles.pickerTitle, { color: theme.text }]}>Weight selector</Text>
              <Text style={[styles.pickerSubtitle, { color: theme.textSecondary }]}>
                The ruler opens at your saved weight and sits directly below the value for quicker edits.
              </Text>

              <View style={styles.pickerContainer}>
                <View style={styles.pickerMarkerWrapper}>
                  <Ionicons name="caret-down" size={32} color={theme.primary} style={styles.markerIcon} />
                </View>
                <View style={styles.rulerWrap}>
                  <RulerPicker
                    key={rulerKey}
                    min={30}
                    max={200}
                    step={0.1}
                    fractionDigits={1}
                    initialValue={defaultWeight}
                    onValueChange={(value) => setSelectedWeight(Number(value))}
                    onValueChangeEnd={(value) => {
                      Haptics.selectionAsync();
                      setSelectedWeight(Number(value));
                    }}
                    unit="kg"
                    shortStepColor={colorScheme === 'dark' ? '#334155' : '#E2E8F0'}
                    longStepColor={colorScheme === 'dark' ? '#94A3B8' : '#64748B'}
                    indicatorColor="transparent"
                    valueTextStyle={{ color: 'transparent', fontSize: 1, lineHeight: 1 }}
                    unitTextStyle={{ color: 'transparent', fontSize: 1, lineHeight: 1 }}
                    indicatorHeight={80}
                    longStepHeight={46}
                    shortStepHeight={22}
                  />
                </View>
              </View>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(200).duration(420)} style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={isSaving || !user?.id}
          style={[
            styles.ctaButton,
            {
              backgroundColor: isSaving ? theme.textSecondary : theme.primary,
              shadowColor: theme.primary,
              opacity: user?.id ? 1 : 0.7,
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaText}>Save Weight</Text>
          )}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  content: {
    gap: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 7,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  weightValue: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -2,
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 8,
    marginBottom: 10,
  },
  supportingText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaCard: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  pickerCard: {
    borderRadius: 30,
    borderWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 6,
  },
  pickerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  pickerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  pickerContainer: {
    width: '100%',
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerMarkerWrapper: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
    alignItems: 'center',
  },
  markerIcon: {
    marginBottom: -10,
  },
  rulerWrap: {
    flex: 1,
    width: '100%',
  },
  footer: {
    paddingTop: 14,
    paddingBottom: 18,
  },
  ctaButton: {
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
