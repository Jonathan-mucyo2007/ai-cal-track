import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, useColorScheme, Alert, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut, SlideOutDown } from 'react-native-reanimated';
import { Colors } from '../../styles/colors';
import * as Haptics from 'expo-haptics';

export const ActionMenuOverlay = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handleAction = (action: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    
    setTimeout(() => {
      if (action === 'water') {
        router.push('/log-water');
      } else if (action === 'exercise') {
        router.push('/log-exercise');
      } else if (action === 'food') {
        router.push('/food-search');
      } else if (action === 'scan') {
        Alert.alert('Premium Feature', 'Scan Food is a premium feature mock.');
      }
    }, 300);
  };

  return (
      <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
          </Pressable>

          <Animated.View entering={FadeInDown.duration(300).springify()} exiting={SlideOutDown.duration(250)} style={styles.menuContainer}>
            <View style={styles.grid}>
              <TouchableOpacity activeOpacity={0.8} style={[styles.gridItem, { backgroundColor: theme.surface }]} onPress={() => handleAction('exercise')}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name="barbell-outline" size={28} color="#38bdf8" />
                </View>
                <Text style={[styles.itemText, { color: theme.text }]}>Log Exercise</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} style={[styles.gridItem, { backgroundColor: theme.surface }]} onPress={() => handleAction('water')}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                  <Ionicons name="water-outline" size={28} color="#34d399" />
                </View>
                <Text style={[styles.itemText, { color: theme.text }]}>Add Water</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} style={[styles.gridItem, { backgroundColor: theme.surface }]} onPress={() => handleAction('food')}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Ionicons name="search-outline" size={28} color="#fbbf24" />
                </View>
                <Text style={[styles.itemText, { color: theme.text }]}>Food Database</Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} style={[styles.gridItem, { backgroundColor: theme.surface, position: 'relative' }]} onPress={() => handleAction('scan')}>
                <View style={styles.premiumBadge}>
                  <MaterialCommunityIcons name="crown" size={12} color="#7c3aed" />
                  <Text style={styles.premiumText}>PRO</Text>
                </View>
                
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
                  <Ionicons name="barcode-outline" size={28} color="#a78bfa" />
                </View>
                <Text style={[styles.itemText, { color: theme.text }]}>Scan Food</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.fabActive, { backgroundColor: theme.surface }]} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={32} color={theme.text} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
  );
};

const styles = StyleSheet.create({
  fabActive: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    alignSelf: 'flex-end',
    marginTop: 16,
    marginRight: 20, // Match CustomTabBar offset
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  menuContainer: {
    alignItems: 'flex-end',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 284,
    justifyContent: 'space-between',
    gap: 16,
  },
  gridItem: {
    width: 134,
    height: 120,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  premiumBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumText: {
    color: '#7c3aed',
    fontSize: 10,
    fontWeight: '800',
  }
});
