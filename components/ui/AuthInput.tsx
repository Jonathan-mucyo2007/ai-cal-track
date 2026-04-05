import React, { useState } from 'react';
import { TextInput, View, StyleSheet, TextInputProps, Animated, useColorScheme } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { Colors } from '../../styles/colors';

interface AuthInputProps extends TextInputProps {
  icon?: LucideIcon;
}

export const AuthInput = ({ icon: Icon, ...props }: AuthInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = React.useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  React.useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, theme.primaryLight],
  });

  return (
    <Animated.View style={[styles.container, { borderColor, backgroundColor: theme.surface }]}>
      {Icon && <Icon color={isFocused ? theme.primary : theme.icon} size={20} style={styles.icon} />}
      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholderTextColor={theme.textSecondary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
});
