type Goal = 'lose' | 'gain' | 'maintain';
type HeightUnit = 'feet' | 'cm';
type WeightUnit = 'kg' | 'lbs';

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
  source?: 'gemini' | 'fallback';
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

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

const geminiApiKey =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  process.env.Gemini_API_Key ||
  '';

const primaryGeminiModel = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.1-pro-preview';
const modelCandidates = [
  primaryGeminiModel,
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash',
];

const extractJsonBlock = (rawText: string) => {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1];
  }

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1);
  }

  return rawText;
};

const parsePlan = (rawText: string): NutritionPlanResult => {
  const parsed = JSON.parse(extractJsonBlock(rawText));

  return {
    generatedAt: new Date().toISOString(),
    source: 'gemini',
    dailyCalories: Number(parsed.dailyCalories),
    macros: {
      proteinGrams: Number(parsed.macros?.proteinGrams),
      carbsGrams: Number(parsed.macros?.carbsGrams),
      fatsGrams: Number(parsed.macros?.fatsGrams),
    },
    dailyWaterLiters: Number(parsed.dailyWaterLiters),
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((item: unknown) => String(item)).slice(0, 5)
      : [],
    summary: String(parsed.summary || ''),
  };
};

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

const generateFallbackPlan = (input: NutritionPlanRequest): NutritionPlanResult => {
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

  const finalCalories = Math.max(1400, roundToNearestFive(calorieTarget));

  const proteinPerKg =
    input.goal === 'gain' ? 2.0 : input.goal === 'lose' ? 2.2 : 1.8;
  const fatsPerKg = input.goal === 'lose' ? 0.8 : 0.9;
  const proteinGrams = roundToNearestFive(weightKg * proteinPerKg);
  const fatsGrams = roundToNearestFive(weightKg * fatsPerKg);
  const caloriesAfterProteinAndFat = finalCalories - proteinGrams * 4 - fatsGrams * 9;
  const carbsGrams = roundToNearestFive(Math.max(100, caloriesAfterProteinAndFat / 4));
  const waterLiters = Math.max(2.2, Number((weightKg * 0.035 + input.workoutDays * 0.18).toFixed(1)));

  const goalLabel =
    input.goal === 'lose' ? 'fat loss' : input.goal === 'gain' ? 'lean muscle gain' : 'maintenance and performance';

  return {
    generatedAt: new Date().toISOString(),
    source: 'fallback',
    dailyCalories: finalCalories,
    macros: {
      proteinGrams,
      carbsGrams,
      fatsGrams,
    },
    dailyWaterLiters: waterLiters,
    recommendations: [
      `Aim for ${input.workoutDays} focused training days each week to support ${goalLabel}.`,
      `Prioritize protein across 3 to 5 meals to make ${proteinGrams}g feel easy to hit consistently.`,
      input.goal === 'lose'
        ? 'Keep a small calorie deficit and target daily steps so fat loss stays steady without crushing recovery.'
        : input.goal === 'gain'
          ? 'Push progressive overload in the gym and keep your calorie surplus controlled to limit unnecessary fat gain.'
          : 'Keep intake stable across the week and adjust slightly based on body weight and training performance.',
      `Use your ${carbsGrams}g carb target around workouts to keep energy and recovery high.`,
    ],
    summary: `Your smart starter plan is tuned for ${goalLabel}, training ${input.workoutDays} days per week, and building consistency from day one.`,
  };
};

const buildPrompt = (input: NutritionPlanRequest) => `
You are an elite AI nutrition coach creating a precise, realistic starting plan for a user's daily nutrition.

User data:
- Gender: ${input.gender}
- Goal: ${input.goal}
- Workout days per week: ${input.workoutDays}
- Birthdate: ${input.birthdate}
- Height: ${input.height.value} ${input.height.unit}
- Weight: ${input.weight.value} ${input.weight.unit}

Instructions:
- Estimate a healthy daily calorie target appropriate for the user's goal and activity level.
- Return macros in grams: protein, carbs, fats.
- Return a daily water intake target in liters.
- Return 3 to 5 short, highly personalized fitness/nutrition recommendations.
- Return one motivating summary sentence.
- Be practical and avoid extreme advice.
- Respond with valid JSON only and no markdown.

Use exactly this JSON shape:
{
  "dailyCalories": 2300,
  "macros": {
    "proteinGrams": 180,
    "carbsGrams": 220,
    "fatsGrams": 70
  },
  "dailyWaterLiters": 3.2,
  "recommendations": [
    "string",
    "string",
    "string"
  ],
  "summary": "string"
}
`;

export const nutritionPlanService = {
  isConfigured() {
    return Boolean(geminiApiKey);
  },

  async generatePlan(input: NutritionPlanRequest): Promise<NutritionPlanResult> {
    if (!geminiApiKey) {
      throw new Error('Missing Gemini API key. Add EXPO_PUBLIC_GEMINI_API_KEY to your .env file.');
    }

    let lastError = '';

    for (const model of modelCandidates) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: buildPrompt(input) }],
              },
            ],
            generationConfig: {
              temperature: 1,
              responseMimeType: 'application/json',
              thinkingConfig: {
                thinkingLevel: model === 'gemini-3.1-pro-preview' ? 'medium' : 'low',
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `Gemini request failed for ${model}: ${response.status} ${errorText}`;

        if (response.status === 404) {
          continue;
        }

        if (response.status === 429) {
          continue;
        }

        throw new Error(lastError);
      }

      const data = (await response.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';

      if (!text.trim()) {
        throw new Error(`Gemini returned an empty response for ${model}.`);
      }

      const plan = parsePlan(text);

      if (
        !plan.dailyCalories ||
        !plan.macros.proteinGrams ||
        !plan.macros.carbsGrams ||
        !plan.macros.fatsGrams ||
        !plan.dailyWaterLiters
      ) {
        throw new Error(`Gemini returned an incomplete nutrition plan for ${model}.`);
      }

      return plan;
    }

    console.warn(lastError || 'Gemini request failed; using local fallback nutrition plan.');
    return generateFallbackPlan(input);
  },
};
