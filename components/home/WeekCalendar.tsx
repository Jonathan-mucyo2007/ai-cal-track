import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withRepeat,
  withSequence,
  interpolateColor,
  useSharedValue,
  withDelay,
  Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../styles/colors';
import { useColorScheme } from 'react-native';

const { width } = Dimensions.get('window');
// Add some padding on sides if you want it to look like a card, 
// but edge-to-edge FlatList usually looks best for calendars.
const WEEK_WIDTH = width;
const DAY_WIDTH = WEEK_WIDTH / 7;

// Helper to get exactly midnight
const getMidnight = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Generate weeks centered around a specific date
const generateWeeks = (centerDate: Date, weeksBefore = 24, weeksAfter = 24) => {
  const centerMidnight = getMidnight(centerDate);
  const dayOfWeek = centerMidnight.getDay(); // 0 is Sunday
  
  // Find the start of the week (Sunday) for the center date
  const startOfCenterWeek = new Date(centerMidnight);
  startOfCenterWeek.setDate(centerMidnight.getDate() - dayOfWeek);

  const weeks = [];
  
  for (let i = -weeksBefore; i <= weeksAfter; i++) {
    const weekStart = new Date(startOfCenterWeek);
    weekStart.setDate(startOfCenterWeek.getDate() + (i * 7));
    
    const weekDays = [];
    for (let j = 0; j < 7; j++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + j);
      weekDays.push(day);
    }
    
    weeks.push({
      id: `week-${i}`,
      index: i,
      days: weekDays
    });
  }
  
  return { weeks, initialScrollIndex: weeksBefore };
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Individual Day Component with complex Reanimated states
const DayComponent = React.memo(({ 
  day, 
  isToday, 
  isSelected, 
  onSelect,
  theme
}: { 
  day: Date, 
  isToday: boolean, 
  isSelected: boolean, 
  onSelect: (d: Date) => void,
  theme: any
}) => {
  const mountAnim = useSharedValue(0);

  useEffect(() => {
    mountAnim.value = withSpring(1, { damping: 12, stiffness: 100 });
  }, [isToday]);

  // The tall pill container background
  const animatedPillStyle = useAnimatedStyle(() => {
    const bgColor = isSelected ? theme.primary : 'transparent';
    
    return {
      backgroundColor: withTiming(bgColor, { duration: 250 }),
      borderWidth: 0, // No borders!
      transform: [
        { scale: mountAnim.value },
        { scale: withSpring(isSelected ? 1.08 : 1, { damping: 14, stiffness: 200, mass: 0.8 }) }
      ],
      // Elegant soft shadow for the whole pill when active
      shadowColor: isSelected ? theme.primary : 'transparent',
      shadowOffset: { width: 0, height: Number(withTiming(isSelected ? 6 : 0, {duration: 250})) },
      shadowOpacity: withTiming(isSelected ? 0.35 : 0, {duration: 250}),
      shadowRadius: withTiming(isSelected ? 8 : 0, {duration: 250}),
      elevation: withTiming(isSelected ? 4 : 0, {duration: 250})
    };
  }, [isSelected, theme, mountAnim]);

  // The inner circle background (white when selected, plain otherwise)
  const animatedCircleStyle = useAnimatedStyle(() => {
    return {
      // In dark mode, we might want a dark surface, but for pure contrast match we can just use pure white or surface.
      // E.g. dark mode -> white circle looks sharp inside green pill.
      backgroundColor: withTiming(isSelected ? theme.surface : 'transparent', { duration: 250 }),
    };
  }, [isSelected, theme]);

  // Day Name color (e.g. Mon, Tue)
  const animatedDayTextStyle = useAnimatedStyle(() => {
    return {
      // If selected it's white (in both modes) against the primary green background
      color: withTiming(
        isSelected ? '#FFFFFF' : theme.textSecondary,
        { duration: 250 }
      ),
      fontWeight: isSelected ? '600' : '500'
    };
  }, [isSelected, theme]);

  // The Date Number
  const textColor = isSelected ? theme.primary : theme.text;
  
  return (
    <TouchableOpacity 
      activeOpacity={0.6} 
      onPress={() => onSelect(day)}
      style={styles.dayContainer}
    >
      <Animated.View style={[styles.tallPill, animatedPillStyle]}>
        <Animated.Text style={[styles.dayName, animatedDayTextStyle]}>
          {DAYS_OF_WEEK[day.getDay()]}
        </Animated.Text>
        
        <Animated.View style={[styles.dateCircle, animatedCircleStyle]}>
          <Text style={[styles.dateNumber, { color: textColor }]}>
            {day.getDate()}
          </Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
});

import { useDate } from '../../contexts/DateContext';

export const WeekCalendar = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [today] = useState(() => getMidnight(new Date()));
  const { selectedDate, setSelectedDate } = useDate();
  const [weeksData, setWeeksData] = useState<{weeks: any[], initialScrollIndex: number}>({ weeks: [], initialScrollIndex: 0 });
  const [currentMonth, setCurrentMonth] = useState('');
  const flatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    setWeeksData(generateWeeks(today, 24, 24));
    setCurrentMonth(today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  }, [today]);

  const handleSelectDate = useCallback((date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(date);
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const centralWeek = viewableItems[0].item;
      // Wednesday is a good representative of the month for that week
      const middleDay = centralWeek.days[3];
      setCurrentMonth(middleDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Use useMemo to prevent unnecessary re-creations
  const renderItem = useCallback(({ item }: { item: any }) => {
    return (
      <View style={styles.weekContainer}>
        {item.days.map((day: Date, idx: number) => {
          const isToday = day.getTime() === today.getTime();
          const isSelected = day.getTime() === selectedDate.getTime();
          
          return (
            <DayComponent
              key={idx}
              day={day}
              isToday={isToday}
              isSelected={isSelected}
              onSelect={handleSelectDate}
              theme={theme}
            />
          );
        })}
      </View>
    );
  }, [selectedDate, today, theme, handleSelectDate]);

  if (weeksData.weeks.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.monthText, { color: theme.text }]}>
          {currentMonth}
        </Text>
        <TouchableOpacity 
          style={styles.todayButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectedDate(today);
            flatListRef.current?.scrollToIndex({ index: weeksData.initialScrollIndex, animated: true });
          }}
        >
          <Text style={[styles.todayButtonText, { color: theme.primary }]}>Today</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        ref={flatListRef}
        data={weeksData.weeks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        initialScrollIndex={weeksData.initialScrollIndex}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: WEEK_WIDTH,
          offset: WEEK_WIDTH * index,
          index,
        })}
        style={styles.flatList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  todayButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(41, 191, 80, 0.1)', 
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  flatList: {
    flexGrow: 0,
  },
  weekContainer: {
    width: WEEK_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  dayContainer: {
    alignItems: 'center',
    width: (WEEK_WIDTH - 32) / 7, 
    paddingVertical: 4,
  },
  tallPill: {
    width: '90%',
    aspectRatio: 0.55,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  dayName: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  dateCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNumber: {
    fontSize: 15,
    fontWeight: '700',
  },
});
