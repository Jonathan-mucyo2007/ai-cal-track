import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart, PieChart, ProgressChart, StackedBarChart } from 'react-native-chart-kit';
import { Colors } from '../../styles/colors';
import { storageService, UserProfileCache } from '../../services/storageService';
import { db } from '../../config/firebase';
import { DailyLogSchema, logsService } from '../../services/logsService';
import { userProfileService } from '../../services/userProfileService';
import { useDate } from '../../contexts/DateContext';
import { analyticsInsightsService, StoredAnalyticsInsights } from '../../services/analyticsInsightsService';

type WeekDaySummary = {
  key: string;
  shortLabel: string;
  chartLabel: string;
  isToday: boolean;
  isActive: boolean;
  caloriesConsumed: number;
  caloriesBurned: number;
  netCalories: number;
  waterConsumedLiters: number;
};

const getWeekWindow = (anchorDate: Date) => {
  const start = new Date(anchorDate);
  const dayIndex = start.getDay();
  const diffToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

const buildWeekSkeleton = (anchorDate: Date): WeekDaySummary[] =>
  getWeekWindow(anchorDate).map((date) => ({
    key: logsService.formatDateToYYYYMMDD(date),
    shortLabel: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
    chartLabel: date.toLocaleDateString(undefined, { weekday: 'short' }),
    isToday: date.toDateString() === new Date().toDateString(),
    isActive: false,
    caloriesConsumed: 0,
    caloriesBurned: 0,
    netCalories: 0,
    waterConsumedLiters: 0,
  }));

const formatCompactNumber = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace('.0', '')}k` : `${Math.round(value)}`;

const formatLiters = (value: number) => `${value.toFixed(1)}L`;

const isLogActive = (log: DailyLogSchema | null) =>
  Boolean(
    log &&
      (
        log.totalCaloriesConsumed > 0 ||
        (log.totalCaloriesBurned || 0) > 0 ||
        (log.totalWaterConsumedLiters || 0) > 0 ||
        (log.logs?.length || 0) > 0 ||
        (log.exerciseLogs?.length || 0) > 0
      )
  );

const getCurrentStreak = (weekData: WeekDaySummary[]) => {
  let streak = 0;
  for (let index = weekData.length - 1; index >= 0; index -= 1) {
    if (!weekData[index].isActive) break;
    streak += 1;
  }
  return streak;
};

const getProgressWidth = (value: number, total: number) => `${Math.min(100, Math.max(0, (value / Math.max(total, 1)) * 100))}%`;

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { user } = useUser();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { selectedDate } = useDate();

  const [profile, setProfile] = useState<UserProfileCache | null>(null);
  const [weekData, setWeekData] = useState<WeekDaySummary[]>(() => buildWeekSkeleton(new Date()));
  const [weeklyCalories, setWeeklyCalories] = useState(0);
  const [weeklyCaloriesBurned, setWeeklyCaloriesBurned] = useState(0);
  const [weeklyWater, setWeeklyWater] = useState(0);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [aiInsights, setAiInsights] = useState<StoredAnalyticsInsights | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    storageService.loadUserProfile().then((storedProfile) => {
      if (storedProfile) setProfile(storedProfile);
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = userProfileService.subscribeToUserProfile(user.id, (nextProfile) => {
      if (nextProfile) setProfile(nextProfile as UserProfileCache);
    });
    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setWeekData(buildWeekSkeleton(selectedDate));
      setWeeklyCalories(0);
      setWeeklyCaloriesBurned(0);
      setWeeklyWater(0);
      setWeeklyWorkouts(0);
      return;
    }

    const weekDates = getWeekWindow(selectedDate);
    const todayString = new Date().toDateString();
    const weekLogs = new Array<DailyLogSchema | null>(weekDates.length).fill(null);

    const syncWeekState = () => {
      const nextWeekData = weekDates.map((date, index) => {
        const log = weekLogs[index];
        const caloriesConsumed = log?.totalCaloriesConsumed || 0;
        const caloriesBurned = log?.totalCaloriesBurned || 0;
        const waterConsumedLiters = log?.totalWaterConsumedLiters || 0;

        return {
          key: logsService.formatDateToYYYYMMDD(date),
          shortLabel: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
          chartLabel: date.toLocaleDateString(undefined, { weekday: 'short' }),
          isToday: date.toDateString() === todayString,
          isActive: isLogActive(log),
          caloriesConsumed,
          caloriesBurned,
          netCalories: caloriesConsumed - caloriesBurned,
          waterConsumedLiters,
        };
      });

      setWeekData(nextWeekData);
      setWeeklyCalories(weekLogs.reduce((sum, log) => sum + (log?.totalCaloriesConsumed || 0), 0));
      setWeeklyCaloriesBurned(weekLogs.reduce((sum, log) => sum + (log?.totalCaloriesBurned || 0), 0));
      setWeeklyWater(weekLogs.reduce((sum, log) => sum + (log?.totalWaterConsumedLiters || 0), 0));
      setWeeklyWorkouts(weekLogs.reduce((sum, log) => sum + (log?.exerciseLogs?.length || 0), 0));
    };

    const unsubscribers = weekDates.map((date, index) => {
      const logRef = doc(db, 'users', user.id, 'dailyLogs', logsService.formatDateToYYYYMMDD(date));
      return onSnapshot(
        logRef,
        (snapshot) => {
          weekLogs[index] = snapshot.exists() ? (snapshot.data() as DailyLogSchema) : null;
          syncWeekState();
        },
        () => {
          weekLogs[index] = null;
          syncWeekState();
        }
      );
    });

    syncWeekState();
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [selectedDate, user?.id]);

  const displayWeekData = useMemo(
    () => (weekData.length === 7 ? weekData : buildWeekSkeleton(selectedDate)),
    [selectedDate, weekData]
  );

  const weightLabel = useMemo(() => {
    if (!profile?.weight?.value || !profile.weight.unit) return 'Not set';
    return `${profile.weight.value} ${profile.weight.unit}`;
  }, [profile?.weight]);

  const calorieGoal = profile?.nutritionPlan?.dailyCalories || 2200;
  const waterGoal = profile?.nutritionPlan?.dailyWaterLiters || 2.5;
  const weeklyWaterGoal = waterGoal * 7;
  const activeDays = displayWeekData.filter((day) => day.isActive).length;
  const currentStreak = getCurrentStreak(displayWeekData);
  const weeklyNetCalories = weeklyCalories - weeklyCaloriesBurned;
  const averageCaloriesPerDay = Math.round(weeklyCalories / 7);
  const averageBurnPerDay = Math.round(weeklyCaloriesBurned / 7);
  const averageWaterPerDay = Number((weeklyWater / 7).toFixed(1));
  const calorieGoalDays = displayWeekData.filter((day) => day.caloriesConsumed > 0 && day.caloriesConsumed <= calorieGoal).length;
  const waterGoalDays = displayWeekData.filter((day) => day.waterConsumedLiters >= waterGoal).length;
  const restDays = 7 - activeDays;
  const bestBurnDay = displayWeekData.reduce((best, day) => (day.caloriesBurned > best.caloriesBurned ? day : best), displayWeekData[0]);
  const mostHydratedDay = displayWeekData.reduce((best, day) => (day.waterConsumedLiters > best.waterConsumedLiters ? day : best), displayWeekData[0]);
  const chartWidth = Math.max(width - 84, 280);
  const momentumCardWidth = Math.min(Math.max(width * 0.68, 220), 280);
  const hasBurnChartData = displayWeekData.some((day) => day.caloriesBurned > 0);
  const hasWaterChartData = displayWeekData.some((day) => day.waterConsumedLiters > 0);
  const hasEnergyMixData = displayWeekData.some((day) => day.caloriesConsumed > 0 || day.caloriesBurned > 0);
  const hasNetTrendData = displayWeekData.some((day) => day.netCalories !== 0);
  const hasWaterGoalBarData = displayWeekData.some((day) => day.waterConsumedLiters > 0);
  const weekRangeLabel = useMemo(() => {
    const firstDay = displayWeekData[0]?.key;
    const lastDay = displayWeekData[6]?.key;
    if (!firstDay || !lastDay) return 'Current week';
    const start = new Date(`${firstDay}T00:00:00`);
    const end = new Date(`${lastDay}T00:00:00`);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }, [displayWeekData]);
  const weekKey = displayWeekData[0]?.key || logsService.formatDateToYYYYMMDD(selectedDate);

  const weeklyBurnChartData = useMemo(
    () => ({ labels: displayWeekData.map((day) => day.chartLabel), datasets: [{ data: displayWeekData.map((day) => day.caloriesBurned) }] }),
    [displayWeekData]
  );

  const weeklyWaterChartData = useMemo(
    () => ({
      labels: displayWeekData.map((day) => day.chartLabel),
      datasets: [{ data: displayWeekData.map((day) => Number(day.waterConsumedLiters.toFixed(1))), color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`, strokeWidth: 3 }],
    }),
    [displayWeekData]
  );

  const weeklyEnergyMixData = useMemo(
    () => ({
      labels: displayWeekData.map((day) => day.shortLabel),
      legend: ['Consumed', 'Burned'],
      data: displayWeekData.map((day) => [Math.round(day.caloriesConsumed), Math.round(day.caloriesBurned)]),
      barColors: ['#FB7185', '#38BDF8'],
    }),
    [displayWeekData]
  );

  const weeklyHabitRingData = useMemo(
    () => ({
      labels: ['Log', 'Cal', 'Water'],
      data: [activeDays / 7, calorieGoalDays / 7, waterGoalDays / 7],
      colors: ['#10B981', '#FB7185', '#38BDF8'],
    }),
    [activeDays, calorieGoalDays, waterGoalDays]
  );

  const consistencyPieData = useMemo(
    () => [
      {
        name: 'Active',
        value: Math.max(activeDays, 0),
        color: '#10B981',
        legendFontColor: colorScheme === 'dark' ? '#CBD5E1' : '#475569',
        legendFontSize: 12,
      },
      {
        name: 'Rest',
        value: Math.max(restDays, 0),
        color: '#F59E0B',
        legendFontColor: colorScheme === 'dark' ? '#CBD5E1' : '#475569',
        legendFontSize: 12,
      },
    ],
    [activeDays, colorScheme, restDays]
  );

  const weeklyNetTrendData = useMemo(
    () => ({
      labels: displayWeekData.map((day) => day.shortLabel),
      datasets: [
        {
          data: displayWeekData.map((day) => day.netCalories),
          color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    }),
    [displayWeekData]
  );

  const weeklyWaterGoalBarData = useMemo(
    () => ({
      labels: displayWeekData.map((day) => day.shortLabel),
      datasets: [
        {
          data: displayWeekData.map((day) => Number(((day.waterConsumedLiters / Math.max(waterGoal, 0.1)) * 100).toFixed(0))),
        },
      ],
    }),
    [displayWeekData, waterGoal]
  );

  const insightInput = useMemo(
    () => ({
      weekKey,
      weekRangeLabel,
      goal: profile?.goal,
      weightLabel,
      calorieGoal,
      waterGoal,
      weeklyCalories,
      weeklyCaloriesBurned,
      weeklyNetCalories,
      weeklyWater,
      weeklyWaterGoal,
      weeklyWorkouts,
      activeDays,
      restDays,
      currentStreak,
      calorieGoalDays,
      waterGoalDays,
      averageCaloriesPerDay,
      averageBurnPerDay,
      averageWaterPerDay,
      bestBurnDayLabel: bestBurnDay?.chartLabel ?? 'No data',
      bestBurnDayCalories: bestBurnDay?.caloriesBurned || 0,
      bestHydrationDayLabel: mostHydratedDay?.chartLabel ?? 'No data',
      bestHydrationLiters: mostHydratedDay?.waterConsumedLiters || 0,
    }),
    [
      activeDays,
      averageBurnPerDay,
      averageCaloriesPerDay,
      averageWaterPerDay,
      bestBurnDay?.caloriesBurned,
      bestBurnDay?.chartLabel,
      calorieGoal,
      calorieGoalDays,
      currentStreak,
      mostHydratedDay?.chartLabel,
      mostHydratedDay?.waterConsumedLiters,
      profile?.goal,
      restDays,
      waterGoal,
      waterGoalDays,
      weekKey,
      weekRangeLabel,
      weeklyCalories,
      weeklyCaloriesBurned,
      weeklyNetCalories,
      weeklyWater,
      weeklyWaterGoal,
      weeklyWorkouts,
      weightLabel,
    ]
  );

  const calorieChartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colorScheme === 'dark' ? '#122033' : '#F7FBFF',
      backgroundGradientTo: colorScheme === 'dark' ? '#0F1B2D' : '#EEF8FF',
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(2, 132, 199, ${opacity})`,
      labelColor: (opacity = 1) => colorScheme === 'dark' ? `rgba(226, 232, 240, ${opacity})` : `rgba(71, 85, 105, ${opacity})`,
      barPercentage: 0.62,
      barRadius: 10,
      fillShadowGradientFrom: theme.primary,
      fillShadowGradientFromOpacity: 0.95,
      fillShadowGradientTo: '#38BDF8',
      fillShadowGradientToOpacity: 0.78,
      propsForBackgroundLines: { stroke: colorScheme === 'dark' ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.18)', strokeDasharray: '' },
      propsForLabels: { fontSize: 12, fontWeight: '700' },
    }),
    [colorScheme, theme.primary]
  );

  const waterChartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colorScheme === 'dark' ? '#081926' : '#F4FBFF',
      backgroundGradientTo: colorScheme === 'dark' ? '#0B2133' : '#EAF8FF',
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
      labelColor: (opacity = 1) => colorScheme === 'dark' ? `rgba(226, 232, 240, ${opacity})` : `rgba(71, 85, 105, ${opacity})`,
      strokeWidth: 3,
      propsForDots: { r: '5', strokeWidth: '2', stroke: colorScheme === 'dark' ? '#0F172A' : '#FFFFFF' },
      propsForBackgroundLines: { stroke: colorScheme === 'dark' ? 'rgba(125,211,252,0.12)' : 'rgba(125,211,252,0.18)', strokeDasharray: '' },
      propsForLabels: { fontSize: 12, fontWeight: '700' },
      fillShadowGradientFrom: '#38BDF8',
      fillShadowGradientFromOpacity: 0.26,
      fillShadowGradientTo: '#7DD3FC',
      fillShadowGradientToOpacity: 0.04,
    }),
    [colorScheme]
  );

  const mixChartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colorScheme === 'dark' ? '#131728' : '#FFF8FB',
      backgroundGradientTo: colorScheme === 'dark' ? '#0E2030' : '#F5FAFF',
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
      labelColor: (opacity = 1) => colorScheme === 'dark' ? `rgba(226, 232, 240, ${opacity})` : `rgba(71, 85, 105, ${opacity})`,
      barPercentage: 0.68,
      propsForBackgroundLines: { stroke: colorScheme === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.16)', strokeDasharray: '' },
      propsForLabels: { fontSize: 11, fontWeight: '700' },
    }),
    [colorScheme]
  );

  const progressChartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colorScheme === 'dark' ? '#0F172A' : '#F8FAFC',
      backgroundGradientTo: colorScheme === 'dark' ? '#0F172A' : '#F8FAFC',
      backgroundGradientFromOpacity: 0,
      backgroundGradientToOpacity: 0,
      color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
      strokeWidth: 10,
      barPercentage: 0.7,
      useShadowColorFromDataset: false,
      propsForLabels: { fontSize: 12, fontWeight: '700' },
    }),
    [colorScheme]
  );

  const momentumLineChartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colorScheme === 'dark' ? '#17142B' : '#F9F5FF',
      backgroundGradientTo: colorScheme === 'dark' ? '#17142B' : '#F9F5FF',
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
      labelColor: (opacity = 1) => colorScheme === 'dark' ? `rgba(226, 232, 240, ${opacity})` : `rgba(71, 85, 105, ${opacity})`,
      propsForDots: { r: '4', strokeWidth: '2', stroke: colorScheme === 'dark' ? '#17142B' : '#FFFFFF' },
      propsForBackgroundLines: { stroke: colorScheme === 'dark' ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.14)', strokeDasharray: '' },
      propsForLabels: { fontSize: 11, fontWeight: '700' },
    }),
    [colorScheme]
  );

  const momentumBarChartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colorScheme === 'dark' ? '#132431' : '#F0FBFF',
      backgroundGradientTo: colorScheme === 'dark' ? '#132431' : '#F0FBFF',
      backgroundGradientFromOpacity: 1,
      backgroundGradientToOpacity: 1,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
      labelColor: (opacity = 1) => colorScheme === 'dark' ? `rgba(226, 232, 240, ${opacity})` : `rgba(71, 85, 105, ${opacity})`,
      barPercentage: 0.62,
      fillShadowGradientFrom: '#22D3EE',
      fillShadowGradientTo: '#38BDF8',
      fillShadowGradientFromOpacity: 0.95,
      fillShadowGradientToOpacity: 0.8,
      propsForBackgroundLines: { stroke: colorScheme === 'dark' ? 'rgba(34,211,238,0.12)' : 'rgba(34,211,238,0.16)', strokeDasharray: '' },
      propsForLabels: { fontSize: 11, fontWeight: '700' },
    }),
    [colorScheme]
  );

  useEffect(() => {
    let isMounted = true;
    if (!user?.id) {
      setAiInsights(null);
      setIsAiLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadInsights = async () => {
      try {
        const stored = await analyticsInsightsService.getStoredWeeklyInsights(user.id, weekKey);
        if (!isMounted) return;

        if (stored) {
          setAiInsights(stored);
        }

        if (!analyticsInsightsService.isRefreshNeeded(stored)) {
          setIsAiLoading(false);
          return;
        }

        setIsAiLoading(true);
        const refreshed = await analyticsInsightsService.generateAndStoreWeeklyInsights(user.id, insightInput);
        if (!isMounted) return;
        setAiInsights(refreshed);
      } catch {
        if (!isMounted) return;
      } finally {
        if (!isMounted) return;
        setIsAiLoading(false);
      }
    };

    loadInsights();

    return () => {
      isMounted = false;
    };
  }, [insightInput, user?.id, weekKey]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(450)} style={styles.headerBlock}>
          <Text style={[styles.title, { color: theme.text }]}>Progress</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>A clear weekly breakdown of your consistency, calories, hydration, and activity.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(420)} style={[styles.card, styles.snapshotCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHead}>
            <View>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>Weekly Snapshot</Text>
              <Text style={[styles.cardTitleLarge, { color: theme.text }]}>{weekRangeLabel}</Text>
            </View>
            <View style={[styles.iconBubble, { backgroundColor: colorScheme === 'dark' ? '#152235' : '#EEF8FF' }]}>
              <Ionicons name="sparkles-outline" size={18} color={theme.primary} />
            </View>
          </View>

          <View style={styles.snapshotGrid}>
            <View style={[styles.tile, { backgroundColor: theme.background }]}><Text style={[styles.tileValue, { color: theme.text }]}>{activeDays}/7</Text><Text style={[styles.tileLabel, { color: theme.textSecondary }]}>Days logged</Text></View>
            <View style={[styles.tile, { backgroundColor: theme.background }]}><Text style={[styles.tileValue, { color: theme.text }]}>{weeklyWorkouts}</Text><Text style={[styles.tileLabel, { color: theme.textSecondary }]}>Workouts</Text></View>
            <View style={[styles.tile, { backgroundColor: theme.background }]}><Text style={[styles.tileValue, { color: theme.text }]}>{calorieGoalDays}</Text><Text style={[styles.tileLabel, { color: theme.textSecondary }]}>Calorie goal days</Text></View>
            <View style={[styles.tile, { backgroundColor: theme.background }]}><Text style={[styles.tileValue, { color: theme.text }]}>{waterGoalDays}</Text><Text style={[styles.tileLabel, { color: theme.textSecondary }]}>Hydration goal days</Text></View>
          </View>
        </Animated.View>

        <View style={styles.topRow}>
          <Animated.View entering={FadeInDown.delay(140).duration(420)} style={styles.primaryWrap}>
            <Pressable onPress={() => setStreakModalVisible(true)} style={[styles.card, styles.pressableCard, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHead}>
                <View style={styles.row}>
                  <View style={[styles.iconBubble, { backgroundColor: colorScheme === 'dark' ? '#173120' : '#ECFDF5' }]}>
                    <Image source={require('../../assets/images/fire.png')} style={styles.fireImage} resizeMode="contain" />
                  </View>
                  <View>
                    <Text style={[styles.eyebrow, { color: theme.primary }]}>Daily Streak</Text>
                    <Text style={[styles.cardTitleSmall, { color: theme.text }]}>Consistency</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </View>
              <Text style={[styles.metricValue, { color: theme.text }]}>{currentStreak}</Text>
              <Text style={[styles.metricHint, { color: theme.textSecondary }]}>{currentStreak === 1 ? 'day in a row' : 'days in a row'}</Text>
              <View style={styles.weekRow}>
                {displayWeekData.map((day) => (
                  <View key={day.key} style={styles.dayWrap}>
                    <View style={[styles.dayPill, { backgroundColor: day.isActive ? theme.primary : colorScheme === 'dark' ? '#233145' : '#EEF2F7', borderColor: day.isToday ? theme.primary : 'transparent' }]}>
                      {day.isActive ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : <View style={[styles.pendingDot, { backgroundColor: theme.textSecondary }]} />}
                    </View>
                    <Text style={[styles.dayLabel, { color: day.isToday ? theme.primary : theme.textSecondary }]}>{day.shortLabel}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(420)} style={styles.secondaryWrap}>
            <Pressable onPress={() => router.push('/update-weight')} style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={[styles.weightIconWrap, { backgroundColor: colorScheme === 'dark' ? 'rgba(56,189,248,0.18)' : '#E0F2FE' }]}><Ionicons name="body-outline" size={24} color="#0284C7" /></View>
              <Text style={[styles.eyebrow, { color: '#0284C7' }]}>Body</Text>
              <Text style={[styles.cardTitleSmall, { color: theme.text }]}>Weight</Text>
              <Text style={[styles.weightValue, { color: theme.text }]} numberOfLines={1}>{weightLabel}</Text>
              <Text style={[styles.metricHint, { color: theme.textSecondary }]}>Saved profile weight</Text>
            </Pressable>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(240).duration(440)} style={[styles.card, styles.analysisCard, { backgroundColor: theme.surface }]}>
          <View style={styles.analysisHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: '#0284C7' }]}>Calories</Text>
              <Text style={[styles.cardTitleLarge, { color: theme.text }]}>Weekly Calorie Analysis</Text>
              <Text style={[styles.analysisSubtitle, { color: theme.textSecondary }]}>Burn, intake, and weekly balance in one place.</Text>
            </View>
            <View style={[styles.heroBox, { backgroundColor: colorScheme === 'dark' ? '#102033' : '#F3FAFF' }]}>
              <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>Net</Text>
              <Text style={[styles.heroValue, { color: weeklyNetCalories <= 0 ? theme.success : theme.text }]}>{weeklyNetCalories > 0 ? '+' : ''}{formatCompactNumber(weeklyNetCalories)}</Text>
              <Text style={styles.heroUnit}>kcal</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={[styles.metricPill, { backgroundColor: colorScheme === 'dark' ? '#122033' : '#F8FBFF' }]}><Text style={[styles.metricPillLabel, { color: theme.textSecondary }]}>Consumed</Text><Text style={[styles.metricPillValue, { color: theme.text }]}>{formatCompactNumber(weeklyCalories)}</Text></View>
            <View style={[styles.metricPill, { backgroundColor: colorScheme === 'dark' ? '#122033' : '#F8FBFF' }]}><Text style={[styles.metricPillLabel, { color: theme.textSecondary }]}>Burned</Text><Text style={[styles.metricPillValue, { color: theme.text }]}>{formatCompactNumber(weeklyCaloriesBurned)}</Text></View>
            <View style={[styles.metricPill, { backgroundColor: colorScheme === 'dark' ? '#122033' : '#F8FBFF' }]}><Text style={[styles.metricPillLabel, { color: theme.textSecondary }]}>Avg/day</Text><Text style={[styles.metricPillValue, { color: theme.text }]}>{formatCompactNumber(averageBurnPerDay)}</Text></View>
          </View>

          <View style={[styles.insightStrip, { backgroundColor: colorScheme === 'dark' ? '#0F1D2D' : '#F7FBFF' }]}>
            <Text style={[styles.insightTitle, { color: theme.text }]}>Weekly read</Text>
            <Text style={[styles.insightText, { color: theme.textSecondary }]}>Best burn day: {bestBurnDay?.chartLabel ?? 'No data'} with {formatCompactNumber(bestBurnDay?.caloriesBurned || 0)} kcal.</Text>
          </View>

          <View style={[styles.chartPanel, { backgroundColor: colorScheme === 'dark' ? '#0E1A2A' : '#F6FBFF', borderColor: colorScheme === 'dark' ? '#1C3149' : '#D8EAF8' }]}>
            <View style={styles.chartHeader}><Text style={[styles.chartTitleText, { color: theme.text }]}>Calories Burned</Text><Text style={[styles.chartCaption, { color: theme.textSecondary }]}>Daily bars for the week</Text></View>
            {hasBurnChartData ? (
              <BarChart data={weeklyBurnChartData} width={chartWidth} height={245} fromZero yAxisSuffix=" kcal" chartConfig={calorieChartConfig} showValuesOnTopOfBars withInnerLines withHorizontalLabels withVerticalLabels showBarTops={false} style={styles.chart} />
            ) : (
              <View style={styles.emptyState}><Ionicons name="bar-chart-outline" size={28} color={theme.textSecondary} /><Text style={[styles.emptyTitle, { color: theme.text }]}>No burn data this week yet</Text><Text style={[styles.emptyText, { color: theme.textSecondary }]}>Exercise calories will appear here once workouts are logged.</Text></View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(270).duration(450)} style={[styles.card, styles.analysisCard, { backgroundColor: theme.surface }]}>
          <View style={styles.analysisHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: '#F43F5E' }]}>Energy Mix</Text>
              <Text style={[styles.cardTitleLarge, { color: theme.text }]}>Intake vs Burn Balance</Text>
              <Text style={[styles.analysisSubtitle, { color: theme.textSecondary }]}>A real week-by-week comparison of calories in and calories out.</Text>
            </View>
            <View style={[styles.heroBox, { backgroundColor: colorScheme === 'dark' ? '#2A1020' : '#FFF3F6' }]}>
              <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>Avg intake</Text>
              <Text style={[styles.heroValue, { color: theme.text }]}>{formatCompactNumber(averageCaloriesPerDay)}</Text>
              <Text style={styles.pinkHeroUnit}>kcal/day</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={[styles.metricPill, { backgroundColor: colorScheme === 'dark' ? '#211423' : '#FFF7F9' }]}><Text style={[styles.metricPillLabel, { color: theme.textSecondary }]}>Consumed</Text><Text style={[styles.metricPillValue, { color: theme.text }]}>{formatCompactNumber(weeklyCalories)}</Text></View>
            <View style={[styles.metricPill, { backgroundColor: colorScheme === 'dark' ? '#132234' : '#F5FBFF' }]}><Text style={[styles.metricPillLabel, { color: theme.textSecondary }]}>Burned</Text><Text style={[styles.metricPillValue, { color: theme.text }]}>{formatCompactNumber(weeklyCaloriesBurned)}</Text></View>
            <View style={[styles.metricPill, { backgroundColor: colorScheme === 'dark' ? '#1F1C12' : '#FFF9ED' }]}><Text style={[styles.metricPillLabel, { color: theme.textSecondary }]}>Rest days</Text><Text style={[styles.metricPillValue, { color: theme.text }]}>{restDays}</Text></View>
          </View>

          <View style={[styles.insightStrip, { backgroundColor: colorScheme === 'dark' ? '#16192B' : '#FAFBFF' }]}>
            <Text style={[styles.insightTitle, { color: theme.text }]}>Weekly read</Text>
            <Text style={[styles.insightText, { color: theme.textSecondary }]}>This view shows where each day leaned: stronger intake, stronger burn, or close balance.</Text>
          </View>

          <View style={[styles.chartPanel, { backgroundColor: colorScheme === 'dark' ? '#101525' : '#FFF9FC', borderColor: colorScheme === 'dark' ? '#27314A' : '#F2DDE6' }]}>
            <View style={styles.chartHeader}><Text style={[styles.chartTitleText, { color: theme.text }]}>Weekly Energy Mix</Text><Text style={[styles.chartCaption, { color: theme.textSecondary }]}>Stacked daily comparison</Text></View>
            {hasEnergyMixData ? (
              <>
                <StackedBarChart
                  data={weeklyEnergyMixData}
                  width={chartWidth}
                  height={255}
                  fromZero
                  hideLegend
                  yAxisSuffix=" kcal"
                  chartConfig={mixChartConfig}
                  style={styles.chart}
                />
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#FB7185' }]} /><Text style={[styles.legendText, { color: theme.textSecondary }]}>Consumed</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#38BDF8' }]} /><Text style={[styles.legendText, { color: theme.textSecondary }]}>Burned</Text></View>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}><Ionicons name="stats-chart-outline" size={28} color={theme.textSecondary} /><Text style={[styles.emptyTitle, { color: theme.text }]}>No calorie comparison yet</Text><Text style={[styles.emptyText, { color: theme.textSecondary }]}>Once meals or workouts are logged, this chart will compare weekly intake and burn day by day.</Text></View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(460)} style={[styles.card, styles.analysisCard, { backgroundColor: theme.surface }]}>
          <View style={styles.analysisHeader}>
            <View>
              <Text style={[styles.eyebrow, { color: '#0EA5E9' }]}>Hydration</Text>
              <Text style={[styles.cardTitleLarge, { color: theme.text }]}>Weekly Water Analysis</Text>
              <Text style={[styles.analysisSubtitle, { color: theme.textSecondary }]}>One clean hydration trend for the full week.</Text>
            </View>
            <View style={[styles.heroBox, { backgroundColor: colorScheme === 'dark' ? '#0F2130' : '#F2FBFF' }]}>
              <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>This week</Text>
              <Text style={[styles.heroValue, { color: theme.text }]}>{formatLiters(weeklyWater)}</Text>
              <Text style={styles.waterHeroUnit}>{Math.min(100, Math.round((weeklyWater / Math.max(weeklyWaterGoal, 0.1)) * 100))}% goal</Text>
            </View>
          </View>

          <View style={styles.metricRow}>
            <View style={[styles.metricPill, { backgroundColor: colorScheme === 'dark' ? '#112131' : '#F8FCFF' }]}><Text style={[styles.metricPillLabel, { color: theme.textSecondary }]}>Average/day</Text><Text style={[styles.metricPillValue, { color: theme.text }]}>{formatLiters(averageWaterPerDay)}</Text></View>
            <View style={[styles.metricPill, { backgroundColor: colorScheme === 'dark' ? '#112131' : '#F8FCFF' }]}><Text style={[styles.metricPillLabel, { color: theme.textSecondary }]}>Target</Text><Text style={[styles.metricPillValue, { color: theme.text }]}>{formatLiters(weeklyWaterGoal)}</Text></View>
            <View style={[styles.metricPill, { backgroundColor: colorScheme === 'dark' ? '#112131' : '#F8FCFF' }]}><Text style={[styles.metricPillLabel, { color: theme.textSecondary }]}>Remaining</Text><Text style={[styles.metricPillValue, { color: theme.text }]}>{formatLiters(Math.max(0, weeklyWaterGoal - weeklyWater))}</Text></View>
          </View>

          <View style={[styles.insightStrip, { backgroundColor: colorScheme === 'dark' ? '#0B1A28' : '#F7FCFF' }]}>
            <Text style={[styles.insightTitle, { color: theme.text }]}>Weekly read</Text>
            <Text style={[styles.insightText, { color: theme.textSecondary }]}>Strongest hydration day: {mostHydratedDay?.chartLabel ?? 'No data'} with {formatLiters(mostHydratedDay?.waterConsumedLiters || 0)}.</Text>
          </View>

          <View style={[styles.chartPanel, { backgroundColor: colorScheme === 'dark' ? '#091824' : '#F6FCFF', borderColor: colorScheme === 'dark' ? '#173349' : '#D9EEF9' }]}>
            <View style={styles.chartHeader}><Text style={[styles.chartTitleText, { color: theme.text }]}>Water Consumed</Text><Text style={[styles.chartCaption, { color: theme.textSecondary }]}>Bezier line in liters</Text></View>
            {hasWaterChartData ? (
              <LineChart data={weeklyWaterChartData} width={chartWidth} height={255} bezier fromZero withShadow withInnerLines withOuterLines={false} withVerticalLines={false} yAxisSuffix="L" chartConfig={waterChartConfig} style={styles.chart} />
            ) : (
              <View style={styles.emptyState}><Ionicons name="water-outline" size={28} color={theme.textSecondary} /><Text style={[styles.emptyTitle, { color: theme.text }]}>No hydration logs for this week</Text><Text style={[styles.emptyText, { color: theme.textSecondary }]}>Water trends will appear here after you start logging hydration.</Text></View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(340).duration(460)} style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.eyebrow, { color: '#8B5CF6' }]}>Goal Completion</Text>
          <Text style={[styles.cardTitleLarge, { color: theme.text }]}>Weekly Momentum</Text>
          <Text style={[styles.analysisSubtitle, { color: theme.textSecondary }]}>A quick visual for how strongly this week is tracking across the essentials.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChartsContent} style={styles.horizontalChartsScroll}>
            <View style={[styles.smallChartPanel, { width: momentumCardWidth, backgroundColor: colorScheme === 'dark' ? '#161B31' : '#F8F7FF' }]}>
              <Text style={[styles.chartTitleText, { color: theme.text }]}>Habit score</Text>
              <ProgressChart
                data={weeklyHabitRingData}
                width={momentumCardWidth - 24}
                height={160}
                strokeWidth={12}
                radius={32}
                hideLegend
                chartConfig={progressChartConfig}
                style={styles.centeredChart}
              />
              <View style={styles.legendColumn}>
                <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#10B981' }]} /><Text style={[styles.legendText, { color: theme.textSecondary }]}>Logging</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#FB7185' }]} /><Text style={[styles.legendText, { color: theme.textSecondary }]}>Calories</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#38BDF8' }]} /><Text style={[styles.legendText, { color: theme.textSecondary }]}>Hydration</Text></View>
              </View>
            </View>

            <View style={[styles.smallChartPanel, { width: momentumCardWidth, backgroundColor: colorScheme === 'dark' ? '#1E1C13' : '#FFFBEF' }]}>
              <Text style={[styles.chartTitleText, { color: theme.text }]}>Active vs rest</Text>
              <PieChart
                data={consistencyPieData}
                width={momentumCardWidth - 16}
                height={160}
                accessor="value"
                backgroundColor="transparent"
                paddingLeft="16"
                center={[10, 0]}
                absolute
                hasLegend={false}
                chartConfig={progressChartConfig}
              />
              <View style={styles.legendColumn}>
                <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#10B981' }]} /><Text style={[styles.legendText, { color: theme.textSecondary }]}>Active days: {activeDays}</Text></View>
                <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: '#F59E0B' }]} /><Text style={[styles.legendText, { color: theme.textSecondary }]}>Rest days: {restDays}</Text></View>
              </View>
            </View>

            <View style={[styles.smallChartPanel, { width: momentumCardWidth, backgroundColor: colorScheme === 'dark' ? '#18142E' : '#F7F2FF' }]}>
              <Text style={[styles.chartTitleText, { color: theme.text }]}>Net trend</Text>
              {hasNetTrendData ? (
                <LineChart
                  data={weeklyNetTrendData}
                  width={momentumCardWidth - 20}
                  height={170}
                  withShadow={false}
                  withInnerLines
                  withOuterLines={false}
                  withVerticalLines={false}
                  chartConfig={momentumLineChartConfig}
                  style={styles.centeredChart}
                />
              ) : (
                <View style={styles.smallEmptyState}>
                  <Ionicons name="pulse-outline" size={24} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Net trend will appear once calorie data is logged.</Text>
                </View>
              )}
            </View>

            <View style={[styles.smallChartPanel, { width: momentumCardWidth, backgroundColor: colorScheme === 'dark' ? '#122432' : '#EEF9FF' }]}>
              <Text style={[styles.chartTitleText, { color: theme.text }]}>Hydration goal %</Text>
              {hasWaterGoalBarData ? (
                <BarChart
                  data={weeklyWaterGoalBarData}
                  width={momentumCardWidth - 20}
                  height={170}
                  fromZero
                  yAxisSuffix="%"
                  chartConfig={momentumBarChartConfig}
                  showValuesOnTopOfBars
                  withInnerLines
                  showBarTops={false}
                  style={styles.centeredChart}
                />
              ) : (
                <View style={styles.smallEmptyState}>
                  <Ionicons name="water-outline" size={24} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Daily hydration percentages will appear here as soon as water is logged.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(360).duration(460)} style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>Weekly Habits</Text>
          <Text style={[styles.cardTitleLarge, { color: theme.text }]}>Simple Progress Signals</Text>
          <Text style={[styles.analysisSubtitle, { color: theme.textSecondary }]}>The three weekly signals that matter most: logging, calorie control, and hydration.</Text>

          <View style={styles.habitRow}><View style={styles.habitTextWrap}><Text style={[styles.habitTitle, { color: theme.text }]}>Logging consistency</Text><Text style={[styles.habitMeta, { color: theme.textSecondary }]}>{activeDays} of 7 days</Text></View><Text style={[styles.habitValue, { color: theme.text }]}>{Math.round((activeDays / 7) * 100)}%</Text></View>
          <View style={[styles.habitTrack, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#EAF2F7' }]}><View style={[styles.habitFill, { width: getProgressWidth(activeDays, 7), backgroundColor: theme.primary }]} /></View>

          <View style={styles.habitRow}><View style={styles.habitTextWrap}><Text style={[styles.habitTitle, { color: theme.text }]}>Calorie goal days</Text><Text style={[styles.habitMeta, { color: theme.textSecondary }]}>{calorieGoalDays} of 7 days</Text></View><Text style={[styles.habitValue, { color: theme.text }]}>{Math.round((calorieGoalDays / 7) * 100)}%</Text></View>
          <View style={[styles.habitTrack, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#EAF2F7' }]}><View style={[styles.habitFill, { width: getProgressWidth(calorieGoalDays, 7), backgroundColor: '#0284C7' }]} /></View>

          <View style={styles.habitRow}><View style={styles.habitTextWrap}><Text style={[styles.habitTitle, { color: theme.text }]}>Hydration goal days</Text><Text style={[styles.habitMeta, { color: theme.textSecondary }]}>{waterGoalDays} of 7 days</Text></View><Text style={[styles.habitValue, { color: theme.text }]}>{Math.round((waterGoalDays / 7) * 100)}%</Text></View>
          <View style={[styles.habitTrack, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#EAF2F7' }]}><View style={[styles.habitFill, { width: getProgressWidth(waterGoalDays, 7), backgroundColor: '#0EA5E9' }]} /></View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(390).duration(480)} style={[styles.card, styles.aiCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHead}>
            <View style={styles.row}>
              <View style={[styles.iconBubble, { backgroundColor: colorScheme === 'dark' ? '#1B243A' : '#EEF4FF' }]}>
                <Ionicons name="sparkles" size={18} color="#8B5CF6" />
              </View>
              <View>
                <Text style={[styles.eyebrow, { color: '#8B5CF6' }]}>AI Insights</Text>
                <Text style={[styles.cardTitleLarge, { color: theme.text }]}>AI Progress Insights</Text>
              </View>
            </View>
            <View style={styles.aiStatusWrap}>
              {isAiLoading ? (
                <View style={[styles.aiStatusPill, { backgroundColor: colorScheme === 'dark' ? '#23173A' : '#F5EEFF' }]}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text style={[styles.aiStatusText, { color: '#8B5CF6' }]}>Updating</Text>
                </View>
              ) : aiInsights?.generatedAt ? (
                <View style={[styles.aiStatusPill, { backgroundColor: colorScheme === 'dark' ? '#132A22' : '#EAFBF3' }]}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={[styles.aiStatusText, { color: '#059669' }]}>
                    {new Date(aiInsights.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.healthScorePill, { backgroundColor: colorScheme === 'dark' ? '#152235' : '#EEF8FF' }]}>
                <Text style={[styles.healthScoreValue, { color: theme.text }]}>{aiInsights?.healthScore ?? '--'}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.analysisSubtitle, { color: theme.textSecondary, marginBottom: 14 }]}>
            {aiInsights?.summary || 'AI coaching insights will appear here once this week has enough data and the refresh window allows a new generation.'}
          </Text>

          <View style={styles.badgeRow}>
            {(aiInsights?.badges || ['Saved Smartly', 'Live Weekly Data', 'Refresh 5h']).map((badge) => (
              <View key={badge} style={[styles.aiBadge, { backgroundColor: colorScheme === 'dark' ? '#172033' : '#F6F7FF' }]}>
                <Text style={[styles.aiBadgeText, { color: theme.text }]}>{badge}</Text>
              </View>
            ))}
          </View>

          <View style={styles.bentoGrid}>
            <View style={[styles.bentoLarge, isAiLoading && !aiInsights ? styles.bentoLoading : null, { backgroundColor: colorScheme === 'dark' ? '#1B1630' : '#F3EEFF' }]}>
              <Text style={[styles.bentoTitle, { color: theme.text }]}>{aiInsights?.headline || 'Weekly intelligence'}</Text>
              <Text style={[styles.bentoText, { color: theme.textSecondary }]}>
                {isAiLoading && !aiInsights ? 'Generating a deeper coaching read from your saved weekly metrics.' : aiInsights?.summary || 'A weekly AI summary will appear here.'}
              </Text>
            </View>

            <View style={[styles.bentoScore, isAiLoading && !aiInsights ? styles.bentoLoading : null, { backgroundColor: colorScheme === 'dark' ? '#132A22' : '#EAFBF3' }]}>
              <Text style={[styles.bentoScoreLabel, { color: theme.textSecondary }]}>Health Score</Text>
              <Text style={[styles.bentoScoreValue, { color: '#059669' }]}>{aiInsights?.healthScore ?? '--'}</Text>
            </View>

            <View style={[styles.bentoWide, isAiLoading && !aiInsights ? styles.bentoLoading : null, { backgroundColor: colorScheme === 'dark' ? '#2C1A14' : '#FFF4EA' }]}>
              <Text style={[styles.bentoTitle, { color: theme.text }]}>{aiInsights?.weeklyWinTitle || 'This Week\'s Win'}</Text>
              <Text style={[styles.bentoText, { color: theme.textSecondary }]}>{aiInsights?.weeklyWinText || 'Your strongest weekly win will appear here.'}</Text>
            </View>

            <View style={[styles.bentoSmall, isAiLoading && !aiInsights ? styles.bentoLoading : null, { backgroundColor: colorScheme === 'dark' ? '#112434' : '#ECFAFF' }]}>
              <Text style={[styles.bentoTitle, { color: theme.text }]}>{aiInsights?.focusTitle || 'Focus'}</Text>
              <Text style={[styles.bentoText, { color: theme.textSecondary }]}>{aiInsights?.focusText || 'Your most important improvement area will appear here.'}</Text>
            </View>

            <View style={[styles.bentoSmall, isAiLoading && !aiInsights ? styles.bentoLoading : null, { backgroundColor: colorScheme === 'dark' ? '#2B1D2F' : '#FFF1F8' }]}>
              <Text style={[styles.bentoTitle, { color: theme.text }]}>{aiInsights?.nextMoveTitle || 'Next Move'}</Text>
              <Text style={[styles.bentoText, { color: theme.textSecondary }]}>{aiInsights?.nextMoveText || 'The best next action will appear here.'}</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal visible={streakModalVisible} transparent animationType="fade" onRequestClose={() => setStreakModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissLayer} onPress={() => setStreakModalVisible(false)} />
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <View style={styles.cardHead}>
              <View style={styles.row}>
                <View style={[styles.iconBubble, { backgroundColor: colorScheme === 'dark' ? '#173120' : '#ECFDF5' }]}>
                  <Image source={require('../../assets/images/fire.png')} style={styles.fireImage} resizeMode="contain" />
                </View>
                <View>
                  <Text style={[styles.eyebrow, { color: theme.primary }]}>Daily Streak</Text>
                  <Text style={[styles.cardTitleLarge, { color: theme.text }]}>Consistency Details</Text>
                </View>
              </View>
              <Pressable onPress={() => setStreakModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.streakHeroRow}>
              <View style={[styles.streakHeroStat, { backgroundColor: colorScheme === 'dark' ? '#172033' : '#F4F9FF' }]}>
                <Text style={[styles.streakHeroValue, { color: theme.text }]}>{currentStreak}</Text>
                <Text style={[styles.streakHeroLabel, { color: theme.textSecondary }]}>Current streak</Text>
              </View>
              <View style={[styles.streakHeroStat, { backgroundColor: colorScheme === 'dark' ? '#132A22' : '#EEFDF5' }]}>
                <Text style={[styles.streakHeroValue, { color: theme.text }]}>{activeDays}/7</Text>
                <Text style={[styles.streakHeroLabel, { color: theme.textSecondary }]}>Logged this week</Text>
              </View>
            </View>

            <Text style={[styles.modalBodyText, { color: theme.textSecondary }]}>
              Every filled day below comes from your real weekly logs. Protecting this chain is one of the fastest ways to build visible progress.
            </Text>

            <View style={styles.modalWeekRow}>
              {displayWeekData.map((day) => (
                <View key={day.key} style={styles.modalDayItem}>
                  <View style={[styles.modalDayCircle, { backgroundColor: day.isActive ? theme.primary : colorScheme === 'dark' ? '#223146' : '#EEF2F7', borderColor: day.isToday ? theme.primary : 'transparent' }]}>
                    {day.isActive ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : <View style={[styles.pendingDot, { backgroundColor: theme.textSecondary }]} />}
                  </View>
                  <Text style={[styles.dayLabel, { color: day.isToday ? theme.primary : theme.textSecondary }]}>{day.shortLabel}</Text>
                </View>
              ))}
            </View>

            <View style={styles.modalStatsGrid}>
              <View style={[styles.modalStatTile, { backgroundColor: theme.background }]}><Text style={[styles.modalStatValue, { color: theme.text }]}>{weeklyWorkouts}</Text><Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Workouts</Text></View>
              <View style={[styles.modalStatTile, { backgroundColor: theme.background }]}><Text style={[styles.modalStatValue, { color: theme.text }]}>{calorieGoalDays}</Text><Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Calorie wins</Text></View>
              <View style={[styles.modalStatTile, { backgroundColor: theme.background }]}><Text style={[styles.modalStatValue, { color: theme.text }]}>{waterGoalDays}</Text><Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Hydration wins</Text></View>
              <View style={[styles.modalStatTile, { backgroundColor: theme.background }]}><Text style={[styles.modalStatValue, { color: theme.text }]}>{restDays}</Text><Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Recovery days</Text></View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 },
  headerBlock: { marginBottom: 24, paddingHorizontal: 4 },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: -0.9, marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, fontWeight: '600', maxWidth: 340 },
  card: { borderRadius: 30, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.07, shadowRadius: 20, elevation: 7, marginBottom: 18 },
  pressableCard: { overflow: 'hidden' },
  snapshotCard: { paddingBottom: 18 },
  aiCard: { paddingBottom: 18 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  cardTitleLarge: { fontSize: 24, fontWeight: '900', letterSpacing: -0.6 },
  cardTitleSmall: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  iconBubble: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fireImage: { width: 22, height: 22 },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '48%', borderRadius: 22, paddingVertical: 18, paddingHorizontal: 14 },
  tileValue: { fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginBottom: 4 },
  tileLabel: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  topRow: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  primaryWrap: { flex: 1.2 },
  secondaryWrap: { flex: 0.88 },
  aiStatusWrap: { alignItems: 'flex-end', gap: 8 },
  aiStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  aiStatusText: { fontSize: 11, fontWeight: '800' },
  healthScorePill: { minWidth: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  healthScoreValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  aiBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  aiBadgeText: { fontSize: 12, fontWeight: '800' },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bentoLoading: { opacity: 0.78 },
  bentoLarge: { width: '62%', minHeight: 150, borderRadius: 24, padding: 16, justifyContent: 'space-between' },
  bentoScore: { width: '34%', minHeight: 150, borderRadius: 24, padding: 16, justifyContent: 'center', alignItems: 'center' },
  bentoWide: { width: '100%', borderRadius: 24, padding: 16, minHeight: 104 },
  bentoSmall: { width: '48.2%', borderRadius: 24, padding: 16, minHeight: 126 },
  bentoTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  bentoText: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  bentoScoreLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  bentoScoreValue: { fontSize: 40, fontWeight: '900', letterSpacing: -1.2 },
  metricValue: { fontSize: 44, fontWeight: '900', letterSpacing: -1.4, marginBottom: 4 },
  metricHint: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, gap: 6 },
  dayWrap: { alignItems: 'center', gap: 8, flex: 1 },
  dayPill: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  pendingDot: { width: 7, height: 7, borderRadius: 3.5, opacity: 0.45 },
  dayLabel: { fontSize: 11, fontWeight: '800' },
  weightIconWrap: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  weightValue: { fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -0.8, marginTop: 14, marginBottom: 8 },
  analysisCard: { paddingBottom: 18 },
  analysisHeader: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  analysisSubtitle: { fontSize: 14, lineHeight: 20, fontWeight: '600', maxWidth: 270 },
  heroBox: { minWidth: 104, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 16, alignItems: 'flex-start', justifyContent: 'center' },
  heroLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroValue: { fontSize: 28, fontWeight: '900', letterSpacing: -0.9, marginBottom: 4 },
  heroUnit: { fontSize: 12, fontWeight: '800', color: '#0284C7', letterSpacing: 0.5 },
  pinkHeroUnit: { fontSize: 12, fontWeight: '800', color: '#F43F5E', letterSpacing: 0.5 },
  waterHeroUnit: { fontSize: 12, fontWeight: '800', color: '#0EA5E9', letterSpacing: 0.5 },
  metricRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricPill: { flex: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 14 },
  metricPillLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  metricPillValue: { fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  insightStrip: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 16 },
  insightTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  insightText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  chartPanel: { borderRadius: 28, borderWidth: 1, paddingTop: 16, paddingBottom: 8, overflow: 'hidden' },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 8 },
  chartTitleText: { fontSize: 15, fontWeight: '800' },
  chartCaption: { fontSize: 12, fontWeight: '700' },
  chart: { marginLeft: -12, borderRadius: 24 },
  centeredChart: { alignSelf: 'center', marginLeft: 0 },
  emptyState: { minHeight: 240, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 18, paddingBottom: 14 },
  legendColumn: { gap: 10, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendSwatch: { width: 10, height: 10, borderRadius: 999 },
  legendText: { fontSize: 12, fontWeight: '700' },
  horizontalChartsScroll: { marginTop: 18, marginHorizontal: -4 },
  horizontalChartsContent: { paddingHorizontal: 4, gap: 12 },
  dualChartGrid: { flexDirection: 'row', gap: 12, marginTop: 18 },
  smallChartPanel: { flex: 1, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 14, minHeight: 270 },
  smallEmptyState: { minHeight: 170, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 10 },
  habitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8, gap: 12 },
  habitTextWrap: { flex: 1 },
  habitTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  habitMeta: { fontSize: 12, fontWeight: '600' },
  habitValue: { fontSize: 16, fontWeight: '900' },
  habitTrack: { width: '100%', height: 10, borderRadius: 999, overflow: 'hidden' },
  habitFill: { height: '100%', borderRadius: 999 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.48)', justifyContent: 'flex-end' },
  modalDismissLayer: { flex: 1 },
  modalCard: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 30 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  streakHeroRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  streakHeroStat: { flex: 1, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 14 },
  streakHeroValue: { fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginBottom: 4 },
  streakHeroLabel: { fontSize: 12, fontWeight: '700' },
  modalBodyText: { fontSize: 14, lineHeight: 21, fontWeight: '600', marginBottom: 18 },
  modalWeekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, gap: 8 },
  modalDayItem: { alignItems: 'center', gap: 8, flex: 1 },
  modalDayCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  modalStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  modalStatTile: { width: '48%', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 14 },
  modalStatValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.6, marginBottom: 4 },
  modalStatLabel: { fontSize: 12, fontWeight: '700' },
});
