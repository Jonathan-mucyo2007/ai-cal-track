import { UserProfileCache } from './storageService';

export const workoutMathService = {

  calculateCaloriesBurned(
    profile: UserProfileCache | null,
    workoutType: string,
    intensity: string,
    durationMins: number
  ): number {

    // Convert weight to KG
    const weightKg =
      profile?.weight?.unit === 'lbs'
        ? profile.weight.value * 0.453592
        : profile?.weight?.value || 70;

    const type = workoutType.toLowerCase();
    const level = intensity.toLowerCase();

    // MET values based on Compendium of Physical Activities
    let met = 5;

    if (type.includes('running')) {
      if (level === 'low') met = 6.0;
      else if (level === 'medium') met = 8.0;
      else met = 10.0;
    }

    else if (type.includes('walking')) {
      if (level === 'low') met = 2.5;
      else if (level === 'medium') met = 3.0;
      else met = 3.8;
    }

    else if (type.includes('cycling')) {
      if (level === 'low') met = 4.0;
      else if (level === 'medium') met = 6.0;
      else met = 8.5;
    }

    else if (type.includes('strength') || type.includes('weight')) {
      if (level === 'low') met = 2.5;
      else if (level === 'medium') met = 3.5;
      else met = 5.0;
    }

    else if (type.includes('hiit')) {
      met = 8.0;
    }

    // Standard MET calorie formula
    const caloriesPerMin = (met * 3.5 * weightKg) / 200;

    const totalCalories = caloriesPerMin * durationMins;

    return Math.max(0, Math.round(totalCalories));
  }

};