import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../styles/colors';
import { useSafeBack } from '../hooks/useSafeBack';
import { foodScanService } from '../services/foodScanService';

export default function ScanFoodCameraScreen() {
  const router = useRouter();
  const goBack = useSafeBack('/(tabs)');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
      });

      if (photo?.uri && photo.base64) {
        const scanId = foodScanService.createCapture({
          imageUri: photo.uri,
          imageBase64: photo.base64,
          mimeType: 'image/jpeg',
        });
        router.replace({
          pathname: '/scan-food-insights',
          params: { scanId },
        });
      }
    } catch (error) {
      console.error('Failed to capture food image', error);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.permissionScreen, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permissionScreen, { backgroundColor: theme.background }]}>
        <Animated.View entering={FadeInUp.duration(420)} style={[styles.permissionCard, { backgroundColor: theme.surface }]}>
          <View style={[styles.permissionIconWrap, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="camera-outline" size={34} color="#16A34A" />
          </View>
          <Text style={[styles.permissionTitle, { color: theme.text }]}>Camera access needed</Text>
          <Text style={[styles.permissionSubtitle, { color: theme.textSecondary }]}>
            Allow camera permission so you can capture your food directly inside the app without the restart issue.
          </Text>
          <TouchableOpacity style={[styles.permissionButton, { backgroundColor: theme.primary }]} onPress={requestPermission} activeOpacity={0.88}>
            <Text style={styles.permissionButtonText}>Allow Camera</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} />

      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />

      <View style={styles.headerRow}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: 'rgba(15, 23, 42, 0.65)' }]} onPress={goBack} activeOpacity={0.86}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture Food</Text>
      </View>

      <Animated.View entering={FadeInDown.duration(420)} style={styles.frameWrap}>
        <View style={styles.scanFrame}>
          <View style={styles.cornerTopLeft} />
          <View style={styles.cornerTopRight} />
          <View style={styles.cornerBottomLeft} />
          <View style={styles.cornerBottomRight} />
        </View>
        <Text style={styles.frameHint}>Center your meal inside the frame for the cleanest analysis.</Text>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.secondaryControl, { backgroundColor: 'rgba(15, 23, 42, 0.65)' }]}
          onPress={() => setCameraFacing((current) => (current === 'back' ? 'front' : 'back'))}
          activeOpacity={0.86}
        >
          <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureOuter} onPress={handleCapture} activeOpacity={0.92} disabled={isCapturing}>
          <View style={styles.captureInner}>
            {isCapturing ? <ActivityIndicator color="#0F172A" /> : <Ionicons name="sparkles" size={24} color="#0F172A" />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryControl, { backgroundColor: 'rgba(15, 23, 42, 0.65)' }]}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.86}
        >
          <Ionicons name="close-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  permissionScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  permissionCard: {
    width: '100%',
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: 'center',
  },
  permissionIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 22,
  },
  permissionButton: {
    minWidth: 180,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 170,
    backgroundColor: 'rgba(2, 6, 23, 0.34)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 210,
    backgroundColor: 'rgba(2, 6, 23, 0.42)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  frameWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scanFrame: {
    width: '100%',
    maxWidth: 310,
    aspectRatio: 1,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'transparent',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 48,
    height: 48,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: 16,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 48,
    height: 48,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
    borderTopRightRadius: 16,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    width: 48,
    height: 48,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    width: 48,
    height: 48,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: 16,
  },
  frameHint: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '700',
    maxWidth: 280,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 34 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 24,
  },
  secondaryControl: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
