import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@clerk/clerk-expo';
import { logsService } from '../services/logsService';
import { useDate } from '../contexts/DateContext';
import { useSafeBack } from '../hooks/useSafeBack';

const MAX_ML = 1000;
const STEP_ML = 125;
const ML_PER_GLASS = 250;

export default function LogWater() {
  const router = useRouter();
  const goBack = useSafeBack('/');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { userId } = useAuth();
  const { selectedDate } = useDate();
  
  const [waterMl, setWaterMl] = useState(0);
  const [isLogging, setIsLogging] = useState(false);

  const handleIncrease = () => {
    if (waterMl < MAX_ML) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setWaterMl(prev => prev + STEP_ML);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleDecrease = () => {
    if (waterMl > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setWaterMl(prev => prev - STEP_ML);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleLogWater = async () => {
    if (waterMl === 0) {
      goBack();
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (userId) {
      setIsLogging(true);
      const liters = waterMl / 1000;
      await logsService.addWaterLog(userId, selectedDate, liters);
      setIsLogging(false);
    }
    router.replace('/');
  };

  const numGlassesToRender = Math.max(1, Math.ceil(waterMl / ML_PER_GLASS));
  const glasses = Array.from({ length: numGlassesToRender }).map((_, index) => {
    const requiredForFull = (index + 1) * ML_PER_GLASS;
    const requiredForHalf = (index * ML_PER_GLASS) + STEP_ML;
    
    if (waterMl >= requiredForFull) return 'full';
    if (waterMl >= requiredForHalf) return 'half';
    return 'empty';
  });

  const glassSizeStyle = {
    width: glasses.length > 2 ? 80 : 120,
    height: glasses.length > 2 ? 120 : 180,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Top Section */}
      <View style={styles.topSection}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.surface }]}
          onPress={goBack}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>Add Water Intake</Text>
      </View>

      {/* Glass Section */}
      <View style={styles.glassSection}>
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.glassesContainer}>
           {glasses.map((status, index) => (
             <AnimatedGlass 
               key={`${index}-${status}`} 
               status={status} 
               style={glassSizeStyle}
             />
           ))}
        </Animated.View>
      </View>

      {/* Controls Section */}
      <View style={styles.controlsSection}>
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.controlsRow}>
          <TouchableOpacity 
            style={[styles.circularButton, waterMl <= 0 && styles.circularButtonDisabled]}
            onPress={handleDecrease}
            activeOpacity={0.7}
            disabled={waterMl <= 0}
          >
            <Ionicons name="remove" size={28} color={theme.textSecondary || '#6B7280'} />
          </TouchableOpacity>

          <View style={styles.amountDisplay}>
            <Text style={[styles.amountText, { color: theme.text }]}>{waterMl}</Text>
            <Text style={[styles.unitText, { color: theme.textSecondary || '#6B7280' }]}>ml</Text>
          </View>

          <TouchableOpacity 
            style={[styles.circularButton, waterMl >= MAX_ML && styles.circularButtonDisabled]}
            onPress={handleIncrease}
            activeOpacity={0.7}
            disabled={waterMl >= MAX_ML}
          >
            <Ionicons name="add" size={28} color="#10B981" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.footer}>
        <TouchableOpacity 
          style={[styles.logButton, { backgroundColor: '#3B82F6' }]} 
          onPress={handleLogWater}
          activeOpacity={0.8}
          disabled={isLogging}
        >
          {isLogging ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.logButtonText}>Log Water</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const AnimatedGlass = ({ status, style }: { status: string, style: any }) => {
  const src = status === 'full' 
    ? require('../assets/images/full_glass.png')
    : status === 'half'
    ? require('../assets/images/half_glass.png')
    : require('../assets/images/empty_glass.png');

  const scaleAnim = useSharedValue(0.5);
  React.useEffect(() => {
    scaleAnim.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, [scaleAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }]
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Animated.Image 
        source={src} 
        style={styles.glassImage} 
        resizeMode="contain" 
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  glassSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  glassImage: {
    width: '100%',
    height: '100%',
  },
  controlsSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  circularButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  circularButtonDisabled: {
    opacity: 0.5,
  },
  amountDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100, 
  },
  amountText: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  unitText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: -4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  logButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28, 
  },
  logButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  }
});
