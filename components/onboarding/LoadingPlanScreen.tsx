import React, { useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../styles/colors';

interface LoadingPlanScreenProps {
  progress: number;
  message: string;
}

export const LoadingPlanScreen = ({ progress, message }: LoadingPlanScreenProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const glow = useSharedValue(0.9);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.9, { duration: 1800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, [glow]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(8, Math.min(progress, 100))}%`,
  }));

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
    opacity: glow.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeIn.duration(500)} style={[styles.blob, styles.blobOne, { backgroundColor: theme.blobStart }]} />
      <Animated.View entering={FadeIn.duration(700)} style={[styles.blob, styles.blobTwo, { backgroundColor: theme.blobEnd }]} />

      <Animated.View entering={FadeInDown.duration(650)} style={styles.content}>
        <Animated.View style={[styles.orb, orbStyle, { borderColor: theme.accent, backgroundColor: theme.surface }]}>
          <View style={[styles.orbCore, { backgroundColor: theme.accent }]} />
        </Animated.View>

        <Text style={[styles.kicker, { color: theme.accentPurple }]}>AI COACH ACTIVATING</Text>
        <Text style={[styles.title, { color: theme.text }]}>Creating your personalized AI-powered nutrition plan...</Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>

        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceBorder }]}>
          <Animated.View style={[styles.progressFill, fillStyle, { backgroundColor: theme.accent }]} />
        </View>

        <Text style={[styles.progressText, { color: theme.text }]}>
          {Math.round(progress)}% complete
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
  },
  orb: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 28,
    shadowColor: '#00F5D4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  orbCore: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.4,
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    maxWidth: 340,
  },
  progressTrack: {
    width: '100%',
    height: 14,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    fontSize: 15,
    fontWeight: '700',
  },
  blob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  blobOne: {
    top: -60,
    left: -90,
  },
  blobTwo: {
    bottom: -90,
    right: -70,
  },
});
