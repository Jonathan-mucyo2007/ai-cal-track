import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { NutritionPlanRequest } from './nutritionMathService';

interface DeterministicPlanInput {
  dailyCalories: number;
  macros: {
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
  };
  dailyWaterLiters: number;
}

interface CoachLayerResult {
  summary: string;
  recommendations: string[];
  coachSource: 'backend' | 'openai' | 'gemini' | 'anthropic' | 'fallback';
  providerModel?: string;
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const BACKEND_ENDPOINT = process.env.EXPO_PUBLIC_AI_COACH_ENDPOINT || '';
const CACHE_PREFIX = '@ai_coach_cache:';

const extractJsonBlock = (rawText: string) => {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) return fencedMatch[1];

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1);
  }

  return rawText;
};

const parseCoachResponse = (
  rawText: string,
  coachSource: CoachLayerResult['coachSource'],
  providerModel?: string
): CoachLayerResult => {
  const parsed = JSON.parse(extractJsonBlock(rawText));

  return {
    coachSource,
    providerModel,
    summary: String(parsed.summary || ''),
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((item: unknown) => String(item)).slice(0, 5)
      : [],
  };
};

const buildCoachPrompt = (user: NutritionPlanRequest, plan: DeterministicPlanInput) => `
You are an elite AI nutrition coach. Nutrition calculations are already complete. Your job is only to create coaching guidance around this plan.

User profile:
- Gender: ${user.gender}
- Goal: ${user.goal}
- Workout days per week: ${user.workoutDays}
- Birthdate: ${user.birthdate}
- Height: ${user.height.value} ${user.height.unit}
- Weight: ${user.weight.value} ${user.weight.unit}

Deterministic nutrition plan:
- Daily calories: ${plan.dailyCalories}
- Protein: ${plan.macros.proteinGrams}g
- Carbs: ${plan.macros.carbsGrams}g
- Fats: ${plan.macros.fatsGrams}g
- Daily water target: ${plan.dailyWaterLiters} liters

Instructions:
- Do not recalculate calories, macros, or water.
- Return 3 to 5 practical, personalized coaching recommendations.
- Return one motivating summary sentence.
- Be specific, realistic, supportive, and not extreme.
- Respond with valid JSON only.

Use exactly this shape:
{
  "summary": "string",
  "recommendations": [
    "string",
    "string",
    "string"
  ]
}
`;

const fetchWithRetry = async (url: string, init: RequestInit, retries = 2) => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown network error');
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries.');
};

const getCacheKey = async (user: NutritionPlanRequest, plan: DeterministicPlanInput) => {
  const payload = JSON.stringify({ user, plan });
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
  return `${CACHE_PREFIX}${hash}`;
};

const getFallbackCoachLayer = (user: NutritionPlanRequest, plan: DeterministicPlanInput): CoachLayerResult => {
  const goalLabel =
    user.goal === 'lose' ? 'fat loss' : user.goal === 'gain' ? 'lean muscle gain' : 'maintenance and performance';

  return {
    coachSource: 'fallback',
    providerModel: 'local-rules',
    summary: `Your smart starter plan is tuned for ${goalLabel}, training ${user.workoutDays} days per week, and building consistency from day one.`,
    recommendations: [
      `Aim for ${user.workoutDays} focused training days each week to support ${goalLabel}.`,
      `Prioritize protein across 3 to 5 meals to make ${plan.macros.proteinGrams}g feel easy to hit consistently.`,
      `Use your ${plan.macros.carbsGrams}g carb target around workouts to keep energy and recovery high.`,
      user.goal === 'lose'
        ? 'Keep a small calorie deficit and steady daily movement so fat loss stays consistent without crushing recovery.'
        : user.goal === 'gain'
          ? 'Push progressive overload in the gym and keep your surplus controlled to turn extra calories into useful training momentum.'
          : 'Keep intake stable most days and adjust gently based on body weight, recovery, and gym performance.',
    ],
  };
};

const requestBackendCoachLayer = async (user: NutritionPlanRequest, plan: DeterministicPlanInput) => {
  if (!BACKEND_ENDPOINT) return null;

  const response = await fetchWithRetry(BACKEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user,
      plan,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend coach request failed: ${response.status} ${await response.text()}`);
  }

  const text = await response.text();
  return parseCoachResponse(text, 'backend', 'custom-endpoint');
};

const requestDevelopmentCoachLayer = async (user: NutritionPlanRequest, plan: DeterministicPlanInput) => {
  const developmentApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  if (!developmentApiKey) return null;

  const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${developmentApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an elite AI nutrition coach. Return valid JSON only.',
        },
        {
          role: 'user',
          content: buildCoachPrompt(user, plan),
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI coach request failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  const text = data.choices?.[0]?.message?.content || '';
  return parseCoachResponse(text, 'openai', 'gpt-4.1-mini-client-dev');
};

export const aiCoachService = {
  async generateCoachLayer(user: NutritionPlanRequest, plan: DeterministicPlanInput): Promise<CoachLayerResult> {
    const cacheKey = await getCacheKey(user, plan);
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached) as CoachLayerResult;
    }

    const providers = [
      () => requestBackendCoachLayer(user, plan),
      () => requestDevelopmentCoachLayer(user, plan),
    ];

    for (const provider of providers) {
      try {
        const result = await provider();
        if (result?.summary && result.recommendations.length) {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
          return result;
        }
      } catch (error) {
        console.warn('AI coach provider failed:', error);
      }
    }

    const fallback = getFallbackCoachLayer(user, plan);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(fallback));
    return fallback;
  },
};
