import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { isUserProfileComplete, storageService, UserProfileCache } from './storageService';

interface ClerkLikeUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
}

const sanitizeProfile = (profile: Partial<UserProfileCache>, user: ClerkLikeUser): UserProfileCache => ({
  userId: user.id,
  firstName: profile.firstName || user.firstName || '',
  lastName: profile.lastName || user.lastName || '',
  email: profile.email || user.primaryEmailAddress?.emailAddress || '',
  gender: profile.gender,
  goal: profile.goal,
  workoutDays: profile.workoutDays,
  birthdate: profile.birthdate,
  height: profile.height,
  weight: profile.weight,
  onboardingCompleted: profile.onboardingCompleted,
  nutritionPlan: profile.nutritionPlan,
});

const preferDefined = <T>(primary: T | undefined, fallback: T | undefined): T | undefined =>
  primary !== undefined ? primary : fallback;

export const profileBootstrapService = {
  async resolveProfile(user: ClerkLikeUser) {
    const localProfile = await storageService.loadUserProfile();

    let remoteProfile: Partial<UserProfileCache> | null = null;
    try {
      const userRef = doc(db, 'users', user.id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        remoteProfile = userSnap.data() as Partial<UserProfileCache>;
      } else {
        await setDoc(userRef, {
          email: user.primaryEmailAddress?.emailAddress || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          createdAt: new Date().toISOString(),
          role: 'user',
        });
      }
    } catch (error) {
      console.error('Profile bootstrap Firestore read failed:', error);
    }

    const merged = sanitizeProfile(
      {
        firstName: preferDefined(localProfile?.firstName, remoteProfile?.firstName),
        lastName: preferDefined(localProfile?.lastName, remoteProfile?.lastName),
        email: preferDefined(localProfile?.email, remoteProfile?.email),
        gender: preferDefined(localProfile?.gender, remoteProfile?.gender),
        goal: preferDefined(localProfile?.goal, remoteProfile?.goal),
        workoutDays: preferDefined(localProfile?.workoutDays, remoteProfile?.workoutDays),
        birthdate: preferDefined(localProfile?.birthdate, remoteProfile?.birthdate),
        height: preferDefined(localProfile?.height, remoteProfile?.height),
        weight: preferDefined(localProfile?.weight, remoteProfile?.weight),
        onboardingCompleted: preferDefined(localProfile?.onboardingCompleted, remoteProfile?.onboardingCompleted),
        nutritionPlan: preferDefined(localProfile?.nutritionPlan, remoteProfile?.nutritionPlan),
      },
      user
    );

    await storageService.saveUserProfile(merged);

    return {
      profile: merged,
      isComplete: isUserProfileComplete(merged),
    };
  },
};
