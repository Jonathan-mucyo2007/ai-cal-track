import { UserProfileCache } from './storageService';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toSafePositiveNumber = (value: unknown, fallback: number) => {
  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

const classifyWorkout = (workoutType: string) => {
  const type = workoutType.toLowerCase();

  if (type.includes('run') || type.includes('jog') || type.includes('treadmill')) return 'running';
  if (type.includes('walk') || type.includes('hike')) return 'walking';
  if (type.includes('cycle') || type.includes('bike') || type.includes('spin')) return 'cycling';
  if (type.includes('swim')) return 'swimming';
  if (type.includes('hiit') || type.includes('interval')) return 'hiit';
  if (type.includes('strength') || type.includes('weight') || type.includes('gym') || type.includes('resistance')) return 'strength';

  return 'general';
};

export const workoutMathService = {

  calculateCaloriesBurned(
    profile: UserProfileCache | null,
    workoutType: string,
    intensity: string,
    durationMins: number
  ): number {

    const rawWeight = toSafePositiveNumber(profile?.weight?.value, 70);
    const weightKg = clamp(
      profile?.weight?.unit === 'lbs' ? rawWeight * 0.453592 : rawWeight,
      35,
      300
    );
    const safeDurationMins = clamp(Math.round(toSafePositiveNumber(durationMins, 0)), 1, 300);

    const level = intensity.toLowerCase();
    const type = classifyWorkout(workoutType);

    let met = 4.5;

    if (type === 'running') {
      if (level === 'low') met = 6.0;
      else if (level === 'medium') met = 8.0;
      else met = 10.0;
    }
    else if (type === 'walking') {
      if (level === 'low') met = 2.5;
      else if (level === 'medium') met = 3.0;
      else met = 4.3;
    }
    else if (type === 'cycling') {
      if (level === 'low') met = 4.0;
      else if (level === 'medium') met = 6.0;
      else met = 8.5;
    }
    else if (type === 'strength') {
      if (level === 'low') met = 3.5;
      else if (level === 'medium') met = 5.0;
      else met = 6.0;
    }
    else if (type === 'swimming') {
      if (level === 'low') met = 5.8;
      else if (level === 'medium') met = 7.0;
      else met = 9.8;
    }
    else if (type === 'hiit') {
      if (level === 'low') met = 7.5;
      else if (level === 'medium') met = 9.5;
      else met = 11.0;
    }

    const caloriesPerMin = (met * 3.5 * weightKg) / 200;
    const estimatedCalories = caloriesPerMin * safeDurationMins;

    return clamp(Math.round(estimatedCalories), 1, 2500);
  }

};
