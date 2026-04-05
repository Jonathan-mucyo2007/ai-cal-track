import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Bell, Plus } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../styles/colors';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '@clerk/clerk-expo';
import { UserProfileCache } from '../../services/storageService';

interface HomeHeaderProps {
  offlineProfile: UserProfileCache | null;
  hasNotifications?: boolean;
}

export function HomeHeader({ offlineProfile, hasNotifications = false }: HomeHeaderProps) {
  const { user } = useUser();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [uploading, setUploading] = useState(false);

  const displayName = user?.firstName || offlineProfile?.firstName || 'Guest';
  const imageUrl = user?.imageUrl || null;

  const handlePickImage = async () => {
    try {
      if (!user) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploading(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await user.setProfileImage({ file: base64Image });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Error uploading image', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.container}>
      <View style={styles.profileSection}>
        <TouchableOpacity onPress={handlePickImage} disabled={uploading}>
          {imageUrl ? (
            <Image source={imageUrl} style={styles.avatar} contentFit="cover" transition={300} />
          ) : (
            <View style={[styles.avatarPlaceholder, { borderColor: theme.primary }]}>
              <Plus size={20} color={theme.primary} strokeWidth={2.5} />
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.textContainer}>
          <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.bellButton, { backgroundColor: theme.surface, borderColor: theme.surfaceBorder }]}
        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        activeOpacity={0.7}
      >
        <Bell size={22} color={theme.text} strokeWidth={2.2} />
        {hasNotifications && (
          <View style={[styles.badge, { backgroundColor: theme.error }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
    width: '100%',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 16,
  },
  uploadingOverlay: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF', // Need to make this dynamic or transparent if possible, or omit the border
  }
});
