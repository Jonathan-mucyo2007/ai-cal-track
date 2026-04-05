import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, BarChart2, User, Plus } from 'lucide-react-native';
import { Colors } from '../../styles/colors';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useDate } from '../../contexts/DateContext';
import { logsService } from '../../services/logsService';
import { ActionMenuOverlay } from '../home/FABMenu';
import { useState } from 'react';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const { user } = useUser();
  const { selectedDate } = useDate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAddLog = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsMenuOpen(true);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.pill, { backgroundColor: theme.surface }]}>
        <View style={styles.tabsContainer}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            let Icon;
            switch (route.name) {
              case 'index':
                Icon = Home;
                break;
              case 'analytics':
                Icon = BarChart2;
                break;
              case 'profile':
                Icon = User;
                break;
              default:
                Icon = Home;
            }

            return (
              <TouchableOpacity
                key={route.name}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabButton}
              >
                <Icon 
                  size={24} 
                  color={isFocused ? theme.primary : theme.tabIconDefault} 
                  strokeWidth={isFocused ? 2.5 : 2}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={handleAddLog}
          activeOpacity={0.8}
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ActionMenuOverlay visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30, // Elevated from bottom
    left: 20,
    right: 20,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    borderRadius: 36,
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    justifyContent: 'space-between',
  },
  tabsContainer: {
    flexDirection: 'row',
    flex: 1,
    height: '100%',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 16,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#29BF50', // Use primary color for shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  }
});
