import AsyncStorage from '@react-native-async-storage/async-storage';
import { NutritionPlanResult } from './nutritionMathService';

export type NutritionPlanCache = NutritionPlanResult;

export interface UserProfileCache {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  gender?: string;
  goal?: 'lose' | 'gain' | 'maintain';
  workoutDays?: number;
  birthdate?: string; // ISO string form
  height?: { value: number; unit: 'feet' | 'cm' };
  weight?: { value: number; unit: 'kg' | 'lbs' };
  onboardingCompleted?: boolean;
  nutritionPlan?: NutritionPlanCache;
}

const CACHE_KEY = '@user_profile_cache';

export const storageService = {
  async saveUserProfile(profile: UserProfileCache): Promise<void> {
    try {
      const jsonValue = JSON.stringify(profile);
      await AsyncStorage.setItem(CACHE_KEY, jsonValue);
    } catch (e) {
      console.error('Failed to save user profile to async storage', e);
    }
  },

  async updateUserProfile(updates: Partial<UserProfileCache>): Promise<UserProfileCache | null> {
    try {
      const current = await this.loadUserProfile();
      if (!current) return null;
      const updated = { ...current, ...updates };
      await this.saveUserProfile(updated);
      return updated;
    } catch (e) {
      console.error('Failed to update user profile', e);
      return null;
    }
  },

  async loadUserProfile(): Promise<UserProfileCache | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(CACHE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error('Failed to load user profile from async storage', e);
      return null;
    }
  },

  async clearUserProfile(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (e) {
      console.error('Failed to clear user profile from async storage', e);
    }
  }
};

export const isNutritionPlanComplete = (plan?: NutritionPlanCache | null) =>
  Boolean(
    plan &&
    plan.dailyCalories > 0 &&
    plan.dailyWaterLiters > 0 &&
    plan.macros?.proteinGrams > 0 &&
    plan.macros?.carbsGrams > 0 &&
    plan.macros?.fatsGrams > 0 &&
    plan.summary &&
    plan.recommendations?.length
  );

export const isUserProfileComplete = (profile?: UserProfileCache | null) =>
  Boolean(
    profile &&
    profile.userId &&
    profile.gender &&
    profile.goal &&
    profile.workoutDays &&
    profile.birthdate &&
    profile.height?.value &&
    profile.weight?.value &&
    profile.onboardingCompleted &&
    isNutritionPlanComplete(profile.nutritionPlan)
  );
