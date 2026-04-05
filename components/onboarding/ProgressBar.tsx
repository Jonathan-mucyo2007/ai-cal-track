import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, ZoomIn } from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { Colors } from '../../styles/colors';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressBar = ({ currentStep, totalSteps }: ProgressBarProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const progressStyle = useAnimatedStyle(() => {
    // Fill ratio minus half a step so the line hits exactly the center of circles
    const fillRatio = Math.max(0, (currentStep - 1) / (totalSteps - 1));
    return {
      width: withSpring(`${fillRatio * 100}%`, { damping: 20, stiffness: 90 }),
    };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.trackContainer, { backgroundColor: theme.surfaceBorder }]}>
        <Animated.View style={[styles.trackFill, { backgroundColor: theme.accent }, progressStyle]} />
      </View>
      <View style={styles.nodesContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;

          return (
            <Animated.View
              key={index}
              style={[
                styles.node,
                { 
                  backgroundColor: isCompleted ? theme.accent : (isActive ? theme.background : theme.surfaceBorder),
                  borderColor: isActive || isCompleted ? theme.accent : theme.surfaceBorder,
                  shadowColor: isActive ? theme.accent : 'transparent',
                },
                isActive && styles.activeNode
              ]}
            >
              {isCompleted && (
                <Animated.View entering={ZoomIn.springify()} style={styles.checkContainer}>
                  <Check color="#000" size={14} strokeWidth={4} />
                </Animated.View>
              )}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 20,
    justifyContent: 'center',
  },
  trackContainer: {
    position: 'absolute',
    top: 36,
    left: 20,
    right: 20,
    height: 4,
    borderRadius: 2,
    zIndex: 1,
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
  nodesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
    paddingHorizontal: 16,
  },
  node: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeNode: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  checkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});
