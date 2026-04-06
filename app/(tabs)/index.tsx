import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, useColorScheme, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { storageService, UserProfileCache } from "../../services/storageService";
import { Colors } from "../../styles/colors";
import { SafeAreaView } from "react-native-safe-area-context";

import { HomeHeader } from "../../components/home/HomeHeader";
import { WeekCalendar } from "../../components/home/WeekCalendar";
import { CaloriesCard } from "../../components/home/CaloriesCard";
import { useDate } from "../../contexts/DateContext";
import { logsService, DailyLogSchema } from "../../services/logsService";
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { EditGoalsModal } from "../../components/home/EditGoalsModal";
import { WaterCard } from "../../components/home/WaterCard";
import { RecentActivity } from "../../components/home/RecentActivity";
import { userProfileService } from "../../services/userProfileService";

export default function HomeDashboard() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [offlineProfile, setOfflineProfile] = useState<UserProfileCache | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyLogSchema | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const { selectedDate } = useDate();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  useEffect(() => {
    storageService.loadUserProfile().then(profile => {
      if (profile) {
        setOfflineProfile(profile);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = userProfileService.subscribeToUserProfile(user.id, (profile) => {
      if (profile) {
        setOfflineProfile(profile as UserProfileCache);
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Real-time listener for the currently selected date's logs
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = logsService.subscribeToDailyLog(user.id, selectedDate, (data) => {
      setDailyLog(data);
    });
    return () => unsubscribe();
  }, [user?.id, selectedDate]);

  // Extract from AI plan or use fallback goals
  const totalCal = offlineProfile?.nutritionPlan?.dailyCalories || 2200;
  
  // Real calculation from Firebase sum
  const consumedCal = dailyLog?.totalCaloriesConsumed || 0;
  const burnedCal = dailyLog?.totalCaloriesBurned || 0;
  // If baseline is totalCal, remaining reduces as you eat, increases as you burn.
  const remainingCal = Math.max(0, totalCal - consumedCal + burnedCal);
  
  const targetCarbs = offlineProfile?.nutritionPlan?.macros?.carbsGrams || 250;
  const targetProtein = offlineProfile?.nutritionPlan?.macros?.proteinGrams || 150;
  const targetFats = offlineProfile?.nutritionPlan?.macros?.fatsGrams || 70;

  const macros = {
    carbsLeft: Math.max(0, targetCarbs - (dailyLog?.totalCarbs || 0)),
    proteinLeft: Math.max(0, targetProtein - (dailyLog?.totalProtein || 0)),
    fatsLeft: Math.max(0, targetFats - (dailyLog?.totalFats || 0))
  };

  const targetWater = offlineProfile?.nutritionPlan?.dailyWaterLiters || 2.5;
  const consumedWater = dailyLog?.totalWaterConsumedLiters || 0;

  const handleAddWater = async (liters: number) => {
    if (!user?.id) return;
    await logsService.addWaterLog(user.id, selectedDate, liters);
  };

  const handleRemoveWater = async (liters: number) => {
    if (!user?.id) return;
    if (consumedWater - liters < 0) return;
    await logsService.addWaterLog(user.id, selectedDate, -liters);
  };

  const handleSaveGoals = async (goals: { dailyCalories: number, proteinGrams: number, carbsGrams: number, fatsGrams: number, dailyWaterLiters: number }) => {
    if (!offlineProfile || !user?.id) return;
    
    const currentPlan = offlineProfile.nutritionPlan || { macros: {} } as any;
    const updatedPlan = {
      ...currentPlan,
      dailyCalories: goals.dailyCalories,
      dailyWaterLiters: goals.dailyWaterLiters,
      macros: {
        ...currentPlan.macros,
        proteinGrams: goals.proteinGrams,
        carbsGrams: goals.carbsGrams,
        fatsGrams: goals.fatsGrams
      }
    };

    const updatedProfile = { ...offlineProfile, nutritionPlan: updatedPlan };
    setOfflineProfile(updatedProfile);
    storageService.saveUserProfile(updatedProfile);

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        nutritionPlan: updatedPlan
      });
    } catch (e) {
      console.error('Failed to sync updated goals to Firebase', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <HomeHeader offlineProfile={offlineProfile} />
        <WeekCalendar />
        
        <CaloriesCard 
          remainingCalories={remainingCal}
          totalCalories={totalCal}
          consumedCalories={consumedCal}
          burnedCalories={burnedCal}
          macros={macros}
          onEditPress={() => setIsEditModalVisible(true)}
        />
        
        <WaterCard 
          targetWaterLiters={targetWater}
          consumedWaterLiters={consumedWater}
          onEditPress={() => setIsEditModalVisible(true)}
          onAddWater={handleAddWater}
          onRemoveWater={handleRemoveWater}
        />
        
        <RecentActivity dailyLog={dailyLog} />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={async () => {
            await storageService.clearUserProfile();
            await signOut();
            router.replace('/welcome');
          }}>
            <Text style={styles.buttonText}>SIGN OUT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <EditGoalsModal 
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleSaveGoals}
        initialValues={{
          dailyCalories: totalCal,
          proteinGrams: targetProtein,
          carbsGrams: targetCarbs,
          fatsGrams: targetFats,
          dailyWaterLiters: targetWater
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // ample padding at the bottom to stay clear of the navigation bar
  },
  buttonContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
  },
  button: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20
  },
  buttonText: {
    color: 'white',
    fontWeight: '700'
  }
});
