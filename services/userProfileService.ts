import { arrayUnion, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { storageService, UserProfileCache } from './storageService';

export const userProfileService = {
  subscribeToUserProfile(
    userId: string,
    callback: (profile: Partial<UserProfileCache> | null) => void
  ) {
    const userRef = doc(db, 'users', userId);

    return onSnapshot(
      userRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }

        const remoteProfile = snapshot.data() as Partial<UserProfileCache>;
        const localProfile = await storageService.loadUserProfile();

        const mergedProfile: UserProfileCache = {
          userId,
          firstName: remoteProfile.firstName ?? localProfile?.firstName ?? '',
          lastName: remoteProfile.lastName ?? localProfile?.lastName ?? '',
          email: remoteProfile.email ?? localProfile?.email ?? '',
          gender: remoteProfile.gender ?? localProfile?.gender,
          goal: remoteProfile.goal ?? localProfile?.goal,
          workoutDays: remoteProfile.workoutDays ?? localProfile?.workoutDays,
          birthdate: remoteProfile.birthdate ?? localProfile?.birthdate,
          height: remoteProfile.height ?? localProfile?.height,
          weight: remoteProfile.weight ?? localProfile?.weight,
          weightUpdatedAt: remoteProfile.weightUpdatedAt ?? localProfile?.weightUpdatedAt,
          weightHistory: remoteProfile.weightHistory ?? localProfile?.weightHistory,
          onboardingCompleted: remoteProfile.onboardingCompleted ?? localProfile?.onboardingCompleted,
          nutritionPlan: remoteProfile.nutritionPlan ?? localProfile?.nutritionPlan,
        };

        await storageService.saveUserProfile(mergedProfile);
        callback(mergedProfile);
      },
      (error) => {
        console.error('Error subscribing to user profile:', error);
        callback(null);
      }
    );
  },

  async updateWeight(userId: string, kilograms: number) {
    const roundedWeight = Number(kilograms.toFixed(1));
    const recordedAt = new Date().toISOString();
    const dateLabel = recordedAt.slice(0, 10);
    const userRef = doc(db, 'users', userId);
    const localProfile = await storageService.loadUserProfile();

    const nextProfile: UserProfileCache = {
      userId,
      firstName: localProfile?.firstName ?? '',
      lastName: localProfile?.lastName ?? '',
      email: localProfile?.email ?? '',
      gender: localProfile?.gender,
      goal: localProfile?.goal,
      workoutDays: localProfile?.workoutDays,
      birthdate: localProfile?.birthdate,
      height: localProfile?.height,
      weight: {
        value: roundedWeight,
        unit: 'kg',
      },
      weightUpdatedAt: recordedAt,
      weightHistory: [
        ...(localProfile?.weightHistory ?? []),
        {
          value: roundedWeight,
          unit: 'kg',
          recordedAt,
          dateLabel,
        },
      ],
      onboardingCompleted: localProfile?.onboardingCompleted,
      nutritionPlan: localProfile?.nutritionPlan,
    };

    await storageService.saveUserProfile(nextProfile);

    await setDoc(
      userRef,
      {
        weight: {
          value: roundedWeight,
          unit: 'kg',
        },
        weightUpdatedAt: recordedAt,
        updatedAt: recordedAt,
        weightHistory: arrayUnion({
          value: roundedWeight,
          unit: 'kg',
          recordedAt,
          dateLabel,
        }),
      },
      { merge: true }
    );
  },
};
