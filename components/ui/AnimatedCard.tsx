import React from 'react';
import { View, StyleSheet, ViewStyle, useColorScheme } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Colors } from '../../styles/colors';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  delay?: number;
}

export const AnimatedCard = ({ children, style, delay = 0 }: AnimatedCardProps) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(600).springify()}
      style={[
        styles.card, 
        { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
        style
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
  },
});
