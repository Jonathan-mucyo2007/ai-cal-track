import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Image } from 'react-native';
import { Colors } from '../../styles/colors';
import Animated, { FadeInUp, useAnimatedStyle, withSpring, useSharedValue, withSequence, withRepeat } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

type Props = {
  targetWaterLiters: number;
  consumedWaterLiters: number;
  onEditPress?: () => void;
  onAddWater?: (liters: number) => void;
  onRemoveWater?: (liters: number) => void;
};

// 1 Glass = 250ml
const LITERS_PER_GLASS = 0.25;
const MAX_GLASSES_PER_ROW = 7;
const MAX_ROWS = 1;
const MAX_RENDER_GLASSES = MAX_GLASSES_PER_ROW * MAX_ROWS;

export const WaterCard = ({ targetWaterLiters, consumedWaterLiters, onEditPress, onAddWater, onRemoveWater }: Props) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  // Math bounds handling
  const totalGlassesTarget = Math.max(1, Math.ceil(targetWaterLiters / LITERS_PER_GLASS));
  const consumedGlassesCount = consumedWaterLiters / LITERS_PER_GLASS;

  // Plot glasses up to the target, bounded by max rendered capacity of 7
  const plotCount = Math.min(totalGlassesTarget, MAX_RENDER_GLASSES);
  
  const remainingLiters = Math.max(0, targetWaterLiters - consumedWaterLiters);
  const remainingGlassesText = Math.max(0, totalGlassesTarget - Math.floor(consumedGlassesCount));

  // Determine glass status visually based on literal consumed tracking 
  const glassesProgressState = Array.from({ length: plotCount }).map((_, index) => {
    const requiredLitersForFull = (index + 1) * LITERS_PER_GLASS;
    const requiredLitersForHalf = (index * LITERS_PER_GLASS) + (LITERS_PER_GLASS / 2);

    if (consumedWaterLiters >= requiredLitersForFull) return 'full';
    if (consumedWaterLiters >= requiredLitersForHalf) return 'half';
    return 'empty';
  });

  const handlePressGlass = (status: string) => {
    router.push('/log-water');
  };

  const handleLongPressGlass = (status: string) => {
    router.push('/log-water');
  };

  return (
    <Animated.View entering={FadeInUp.delay(200).duration(600).springify()} style={[styles.cardContainer, { backgroundColor: theme.surface }]}>
      
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Water</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
          <Text style={[styles.editButtonText, { color: theme.textSecondary }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Glasses Rendering */}
      <View style={styles.glassesWrapper}>
        <View style={styles.glassesContainer}>
          {glassesProgressState.map((status, index) => {
            let src;
            if (status === 'full') src = require('../../assets/images/full_glass.png');
            else if (status === 'half') src = require('../../assets/images/half_glass.png');
            else src = require('../../assets/images/empty_glass.png');

            return (
              <AnimatedGlassIcon 
                key={index} 
                source={src} 
                status={status}
                onPress={() => handlePressGlass(status)} 
                onLongPress={() => handleLongPressGlass(status)}
              />
            );
          })}
        </View>
      </View>

      {/* Footer / Status */}
      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          {remainingLiters <= 0 
            ? "Goal Complete! Great job staying hydrated." 
            : `${remainingGlassesText} glasses left (${remainingLiters.toFixed(2)}L)`}
        </Text>
      </View>
      
    </Animated.View>
  );
};

// Extracted Glass Icon with Interactive Click Pop Anim
const AnimatedGlassIcon = ({ source, status, onPress, onLongPress }: { source: any, status: string, onPress: () => void, onLongPress: () => void }) => {
  const scaleAnim = useSharedValue(1);
  const translateY = useSharedValue(0);

  // Setup idle animation
  React.useEffect(() => {
    if (status !== 'full') {
      const randomDelay = Math.random() * 1000;
      setTimeout(() => {
        translateY.value = withRepeat(
          withSequence(
            withSpring(-4, { damping: 10, stiffness: 40 }),
            withSpring(0, { damping: 10, stiffness: 40 })
          ),
          -1,
          true
        );
      }, randomDelay);
    } else {
      translateY.value = withSpring(0);
    }
  }, [status, translateY]);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scaleAnim.value },
        { translateY: translateY.value }
      ]
    };
  });

  const handlePress = () => {
    scaleAnim.value = withSequence(
      withSpring(0.8, { damping: 10, stiffness: 200 }),
      withSpring(1.05, { damping: 10, stiffness: 200 }),
      withSpring(1)
    );
    onPress();
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={handlePress} 
      onLongPress={() => {
        scaleAnim.value = withSequence(
          withSpring(0.8, { damping: 10, stiffness: 200 }),
          withSpring(1)
        );
        onLongPress();
      }}
      delayLongPress={400}
      style={styles.glassTouch}
    >
      <Animated.Image 
        source={source} 
        style={[styles.glassImage, animatedStyle]} 
        resizeMode="contain" 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  editButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  glassesWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  glassesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  glassTouch: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassImage: {
    width: '100%',
    height: '100%',
  },
  footerRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  }
});
