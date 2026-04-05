import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Extrapolation,
} from 'react-native-reanimated';
import { Colors } from '../../styles/colors';

interface FlipCardProps {
  isFlipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
}

const { width } = Dimensions.get('window');

export const FlipCard = ({ isFlipped, front, back }: FlipCardProps) => {
  const spin = useSharedValue(isFlipped ? 1 : 0);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    spin.value = withSpring(isFlipped ? 1 : 0, {
      damping: 15,
      stiffness: 100,
      mass: 0.8,
    });
  }, [isFlipped]);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const spinVal = interpolate(spin.value, [0, 1], [0, 180], Extrapolation.CLAMP);
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${spinVal}deg` },
      ],
      opacity: spin.value < 0.5 ? 1 : 0,
      zIndex: spin.value < 0.5 ? 2 : 1,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const spinVal = interpolate(spin.value, [0, 1], [-180, 0], Extrapolation.CLAMP);
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${spinVal}deg` },
      ],
      opacity: spin.value > 0.5 ? 1 : 0,
      zIndex: spin.value > 0.5 ? 2 : 1,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[
          styles.cardContainer, 
          frontAnimatedStyle,
          { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }
        ]}>
        {front}
      </Animated.View>
      <Animated.View style={[
          styles.cardContainer, 
          styles.backCard, 
          backAnimatedStyle,
          { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }
        ]}>
        {back}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: width * 0.85,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    backfaceVisibility: 'hidden',
  },
  backCard: {
    position: 'absolute',
    top: 0,
  },
});
