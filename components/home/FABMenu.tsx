import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, useColorScheme, Alert, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut, SlideOutDown } from 'react-native-reanimated';
import { Colors } from '../../styles/colors';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { foodScanService } from '../../services/foodScanService';

export const ActionMenuOverlay = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [isScanDialogVisible, setIsScanDialogVisible] = useState(false);
  const [isPreparingScan, setIsPreparingScan] = useState(false);

  const closeScanDialog = () => setIsScanDialogVisible(false);

  const navigateToAnalysis = useCallback((scanId: string) => {
    closeScanDialog();
    onClose();
    router.push({
      pathname: '/scan-food-insights',
      params: {
        scanId,
      },
    });
  }, [onClose, router]);

  const openGallery = async () => {
    setIsPreparingScan(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.uri && result.assets[0]?.base64) {
        const scanId = foodScanService.createCapture({
          imageUri: result.assets[0].uri,
          imageBase64: result.assets[0].base64,
          mimeType: result.assets[0].mimeType || 'image/jpeg',
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigateToAnalysis(scanId);
      }
    } catch (error) {
      console.error('Gallery selection failed', error);
      Alert.alert('Could not open gallery', 'Please try selecting your food image again.');
    } finally {
      setIsPreparingScan(false);
    }
  };

  const openCamera = async () => {
    closeScanDialog();
    onClose();
    router.push('/scan-food-camera');
  };

  const handleAction = (action: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (action === 'scan') {
      setIsScanDialogVisible(true);
      return;
    }

    onClose();

    setTimeout(() => {
      if (action === 'water') {
        router.push('/log-water');
      } else if (action === 'exercise') {
        router.push('/log-exercise');
      } else if (action === 'food') {
        router.push('/food-search');
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

          <Modal transparent visible={isScanDialogVisible} animationType="fade" onRequestClose={closeScanDialog}>
            <View style={styles.scanDialogBackdrop}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeScanDialog} />
              <Animated.View entering={FadeInDown.duration(320).springify()} style={[styles.scanDialogCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.scanHero, { backgroundColor: colorScheme === 'dark' ? 'rgba(107,70,193,0.18)' : '#F5EEFF' }]}>
                  <View style={styles.scanBadge}>
                    <MaterialCommunityIcons name="image-search-outline" size={18} color="#7c3aed" />
                    <Text style={styles.scanBadgeText}>Smart Scan</Text>
                  </View>
                  <Text style={[styles.scanTitle, { color: theme.text }]}>How do you want to scan your food?</Text>
                  <Text style={[styles.scanSubtitle, { color: theme.textSecondary }]}>
                    Choose a fresh photo or pick one from your gallery and we’ll prepare it for nutrition analysis.
                  </Text>
                </View>

                <View style={styles.scanOptions}>
                  <TouchableOpacity
                    style={[styles.scanOptionCard, { backgroundColor: theme.background }]}
                    activeOpacity={0.88}
                    onPress={openGallery}
                    disabled={isPreparingScan}
                  >
                    <View style={[styles.scanOptionIcon, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name="images-outline" size={24} color="#0284C7" />
                    </View>
                    <View style={styles.scanOptionTextWrap}>
                      <Text style={[styles.scanOptionTitle, { color: theme.text }]}>Upload From Gallery</Text>
                      <Text style={[styles.scanOptionSubtitle, { color: theme.textSecondary }]}>
                        Pick a saved meal photo and continue instantly.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.scanOptionCard, { backgroundColor: theme.background }]}
                    activeOpacity={0.88}
                    onPress={openCamera}
                    disabled={isPreparingScan}
                  >
                    <View style={[styles.scanOptionIcon, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="camera-outline" size={24} color="#16A34A" />
                    </View>
                    <View style={styles.scanOptionTextWrap}>
                      <Text style={[styles.scanOptionTitle, { color: theme.text }]}>Take a Picture</Text>
                      <Text style={[styles.scanOptionSubtitle, { color: theme.textSecondary }]}>
                        Capture the food live with your device camera.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.scanDialogFooter}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: theme.surfaceBorder }]}
                    activeOpacity={0.85}
                    onPress={closeScanDialog}
                    disabled={isPreparingScan}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  {isPreparingScan && (
                    <View style={styles.preparingState}>
                      <ActivityIndicator color={theme.primary} />
                      <Text style={[styles.preparingText, { color: theme.textSecondary }]}>Preparing scan...</Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            </View>
          </Modal>
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
  },
  scanDialogBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(3, 7, 18, 0.52)',
  },
  scanDialogCard: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 14,
  },
  scanHero: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  scanBadgeText: {
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '800',
  },
  scanTitle: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  scanSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  scanOptions: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 12,
  },
  scanOptionCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scanOptionIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanOptionTextWrap: {
    flex: 1,
  },
  scanOptionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  scanOptionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  scanDialogFooter: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 12,
  },
  cancelButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  preparingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  preparingText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
