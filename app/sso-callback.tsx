import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Colors } from '../styles/colors';

export default function SsoCallbackScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.title, { color: theme.text }]}>Finishing sign-in</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Completing your secure login and loading your account.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
