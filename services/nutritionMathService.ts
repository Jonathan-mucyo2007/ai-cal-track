export type Goal = 'lose' | 'gain' | 'maintain';
export type HeightUnit = 'feet' | 'cm';
export type WeightUnit = 'kg' | 'lbs';

export interface NutritionPlanRequest {
  gender: string;
  goal: Goal;
  workoutDays: number;
  birthdate: string;
  height: { value: number; unit: HeightUnit };
  weight: { value: number; unit: WeightUnit };
}

export interface NutritionPlanResult {
  generatedAt: string;
  planSource: 'deterministic';
  coachSource: 'backend' | 'openai' | 'gemini' | 'anthropic' | 'fallback';
  providerModel?: string;
  dailyCalories: number;
  macros: {
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
  };
  dailyWaterLiters: number;
  recommendations: string[];
  summary: string;
}

const roundToNearestFive = (value: number) => Math.round(value / 5) * 5;

const getAge = (birthdate: string) => {
  const dob = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return Math.max(age, 18);
};

const toCm = (height: NutritionPlanRequest['height']) =>
  height.unit === 'cm' ? height.value : height.value * 30.48;

const toKg = (weight: NutritionPlanRequest['weight']) =>
  weight.unit === 'kg' ? weight.value : weight.value * 0.453592;

const getActivityMultiplier = (workoutDays: number) => {
  if (workoutDays <= 1) return 1.2;
  if (workoutDays <= 3) return 1.375;
  if (workoutDays <= 5) return 1.55;
  return 1.725;
};

export const nutritionMathService = {
  calculateBasePlan(input: NutritionPlanRequest) {
    const age = getAge(input.birthdate);
    const heightCm = toCm(input.height);
    const weightKg = toKg(input.weight);
    const activityMultiplier = getActivityMultiplier(input.workoutDays);
    const gender = input.gender.toLowerCase();

    const bmrBase = 10 * weightKg + 6.25 * heightCm - 5 * age;
    const bmr =
      gender === 'male'
        ? bmrBase + 5
        : gender === 'female'
          ? bmrBase - 161
          : bmrBase - 78;

    const maintenanceCalories = bmr * activityMultiplier;
    const calorieTarget =
      input.goal === 'lose'
        ? maintenanceCalories - 450
        : input.goal === 'gain'
          ? maintenanceCalories + 280
          : maintenanceCalories;

    const dailyCalories = Math.max(1400, roundToNearestFive(calorieTarget));
    const proteinPerKg = input.goal === 'gain' ? 2.0 : input.goal === 'lose' ? 2.2 : 1.8;
    const fatsPerKg = input.goal === 'lose' ? 0.8 : 0.9;
    const proteinGrams = roundToNearestFive(weightKg * proteinPerKg);
    const fatsGrams = roundToNearestFive(weightKg * fatsPerKg);
    const remainingCalories = dailyCalories - proteinGrams * 4 - fatsGrams * 9;
    const carbsGrams = roundToNearestFive(Math.max(100, remainingCalories / 4));
    const dailyWaterLiters = Math.max(2.2, Number((weightKg * 0.035 + input.workoutDays * 0.18).toFixed(1)));

    return {
      age,
      heightCm: Number(heightCm.toFixed(1)),
      weightKg: Number(weightKg.toFixed(1)),
      activityMultiplier,
      dailyCalories,
      macros: {
        proteinGrams,
        carbsGrams,
        fatsGrams,
      },
      dailyWaterLiters,
    };
  },
};
