import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface AnalyticsInsightsInput {
  weekKey: string;
  weekRangeLabel: string;
  goal?: 'lose' | 'gain' | 'maintain';
  weightLabel: string;
  calorieGoal: number;
  waterGoal: number;
  weeklyCalories: number;
  weeklyCaloriesBurned: number;
  weeklyNetCalories: number;
  weeklyWater: number;
  weeklyWaterGoal: number;
  weeklyWorkouts: number;
  activeDays: number;
  restDays: number;
  currentStreak: number;
  calorieGoalDays: number;
  waterGoalDays: number;
  averageCaloriesPerDay: number;
  averageBurnPerDay: number;
  averageWaterPerDay: number;
  bestBurnDayLabel: string;
  bestBurnDayCalories: number;
  bestHydrationDayLabel: string;
  bestHydrationLiters: number;
}

export interface AnalyticsInsightsResult {
  healthScore: number;
  headline: string;
  summary: string;
  badges: string[];
  weeklyWinTitle: string;
  weeklyWinText: string;
  focusTitle: string;
  focusText: string;
  nextMoveTitle: string;
  nextMoveText: string;
  source: 'gemini' | 'fallback';
  model?: string;
}

export interface StoredAnalyticsInsights extends AnalyticsInsightsResult {
  generatedAt: string;
  generatedAtMs: number;
  weekKey: string;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
}

const geminiApiKey =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  process.env.EXPO_PUBLIC_GEMIN_API_KEY ||
  '';
const refreshWindowMs = 5 * 60 * 60 * 1000;
const modelCandidates = [
  process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

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

const parseResult = (rawText: string, model?: string): AnalyticsInsightsResult => {
  const parsed = JSON.parse(extractJsonBlock(rawText));

  return {
    healthScore: Math.max(1, Math.min(100, Number(parsed.healthScore) || 70)),
    headline: String(parsed.headline || 'Weekly Progress Insight'),
    summary: String(parsed.summary || ''),
    badges: Array.isArray(parsed.badges) ? parsed.badges.map((item: unknown) => String(item)).slice(0, 3) : [],
    weeklyWinTitle: String(parsed.weeklyWinTitle || 'This Week\'s Win'),
    weeklyWinText: String(parsed.weeklyWinText || ''),
    focusTitle: String(parsed.focusTitle || 'Focus'),
    focusText: String(parsed.focusText || ''),
    nextMoveTitle: String(parsed.nextMoveTitle || 'Next Move'),
    nextMoveText: String(parsed.nextMoveText || ''),
    source: 'gemini',
    model,
  };
};

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

const buildPrompt = (input: AnalyticsInsightsInput) => `
You are a world-class fitness analytics coach. Analyze this user's real weekly health data and return a compact, motivating, practical analytics summary for a mobile app.

Real weekly input:
- Week: ${input.weekRangeLabel}
- Goal: ${input.goal || 'maintain'}
- Weight: ${input.weightLabel}
- Daily calorie goal: ${input.calorieGoal}
- Daily water goal liters: ${input.waterGoal}
- Weekly calories consumed: ${input.weeklyCalories}
- Weekly calories burned: ${input.weeklyCaloriesBurned}
- Weekly net calories: ${input.weeklyNetCalories}
- Weekly water liters: ${input.weeklyWater}
- Weekly water goal liters: ${input.weeklyWaterGoal}
- Weekly workouts: ${input.weeklyWorkouts}
- Active days: ${input.activeDays}
- Rest days: ${input.restDays}
- Current streak: ${input.currentStreak}
- Calorie goal days: ${input.calorieGoalDays}
- Water goal days: ${input.waterGoalDays}
- Average calories per day: ${input.averageCaloriesPerDay}
- Average calories burned per day: ${input.averageBurnPerDay}
- Average water per day liters: ${input.averageWaterPerDay}
- Best burn day: ${input.bestBurnDayLabel} with ${input.bestBurnDayCalories} calories burned
- Best hydration day: ${input.bestHydrationDayLabel} with ${input.bestHydrationLiters} liters

Instructions:
- Be encouraging, specific, and actionable.
- Use only the data provided. Do not invent measurements.
- Keep each field concise and mobile-friendly.
- healthScore must be 1 to 100.
- badges should be 3 short labels, 1 to 3 words each.
- weeklyWinText, focusText, and nextMoveText should each be one strong sentence.
- Return valid JSON only.

Use exactly this shape:
{
  "healthScore": 82,
  "headline": "string",
  "summary": "string",
  "badges": ["string", "string", "string"],
  "weeklyWinTitle": "string",
  "weeklyWinText": "string",
  "focusTitle": "string",
  "focusText": "string",
  "nextMoveTitle": "string",
  "nextMoveText": "string"
}
`;

const getFallbackInsights = (input: AnalyticsInsightsInput): AnalyticsInsightsResult => {
  const hydrationRate = input.weeklyWaterGoal > 0 ? input.weeklyWater / input.weeklyWaterGoal : 0;
  const consistencyRate = input.activeDays / 7;
  const calorieRate = input.calorieGoalDays / 7;
  const waterRate = input.waterGoalDays / 7;
  const score = Math.round(
    Math.min(
      100,
      Math.max(
        35,
        consistencyRate * 34 +
          calorieRate * 28 +
          waterRate * 24 +
          Math.min(input.weeklyWorkouts, 7) * 2 +
          Math.min(input.currentStreak, 7) * 2
      )
    )
  );

  const badges = [
    input.currentStreak >= 4 ? 'Streak Builder' : 'Building Rhythm',
    hydrationRate >= 0.85 ? 'Hydration Up' : 'Hydration Focus',
    input.weeklyNetCalories <= 0 ? 'Balanced Burn' : 'Fuel Watch',
  ];

  return {
    healthScore: score,
    headline: 'AI Progress Insights',
    summary:
      input.activeDays >= 5
        ? `You logged ${input.activeDays} active days this week and built a strong routine around your ${input.goal || 'health'} goal.`
        : `Your week has useful data already, and a little more consistency will make your progress signals much clearer.`,
    badges,
    weeklyWinTitle: 'This Week\'s Win',
    weeklyWinText:
      input.currentStreak >= 3
        ? `You stayed consistent for ${input.currentStreak} days in a row, which is the strongest signal that your routine is becoming sustainable.`
        : `You already have ${input.activeDays} logged days this week, giving you a solid base to improve from.`,
    focusTitle: 'Most Important Focus',
    focusText:
      waterRate < calorieRate
        ? `Hydration is your biggest unlock right now. Lifting your average from ${input.averageWaterPerDay.toFixed(1)}L toward ${input.waterGoal.toFixed(1)}L a day would sharpen recovery and energy.`
        : `Keep tightening calorie consistency. Hitting your target on more than ${input.calorieGoalDays} days will make the rest of your metrics look stronger fast.`,
    nextMoveTitle: 'Next Best Move',
    nextMoveText:
      input.weeklyWorkouts < 3
        ? `Add one more workout or intentional movement session next week to turn your current momentum into a more visible fat-burn and stamina trend.`
        : `Protect your current rhythm and repeat your strongest day pattern from ${input.bestBurnDayLabel} to make next week even more stable.`,
    source: 'fallback',
    model: 'local-rules',
  };
};

const requestGeminiInsights = async (input: AnalyticsInsightsInput) => {
  if (!geminiApiKey) {
    throw new Error('Missing Gemini API key.');
  }

  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    try {
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.55,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini request failed for ${model}: ${response.status} ${await response.text()}`);
      }

      const data = (await response.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
      if (!text) throw new Error(`Gemini returned an empty response for ${model}.`);
      return parseResult(text, model);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown Gemini error');
    }
  }

  throw lastError || new Error('Gemini insights failed.');
};

export const analyticsInsightsService = {
  getInsightDoc(userId: string, weekKey: string) {
    return doc(db, 'users', userId, 'analyticsInsights', weekKey);
  },

  async getStoredWeeklyInsights(userId: string, weekKey: string): Promise<StoredAnalyticsInsights | null> {
    const snapshot = await getDoc(this.getInsightDoc(userId, weekKey));
    if (!snapshot.exists()) return null;
    return snapshot.data() as StoredAnalyticsInsights;
  },

  isRefreshNeeded(stored: StoredAnalyticsInsights | null) {
    if (!stored?.generatedAtMs) return true;
    return Date.now() - stored.generatedAtMs > refreshWindowMs;
  },

  async generateAndStoreWeeklyInsights(userId: string, input: AnalyticsInsightsInput): Promise<StoredAnalyticsInsights> {
    let result: AnalyticsInsightsResult;

    try {
      result = await requestGeminiInsights(input);
    } catch (error) {
      console.warn('Analytics insights AI failed:', error);
      result = getFallbackInsights(input);
    }

    const stored: StoredAnalyticsInsights = {
      ...result,
      weekKey: input.weekKey,
      generatedAt: new Date().toISOString(),
      generatedAtMs: Date.now(),
    };

    await setDoc(this.getInsightDoc(userId, input.weekKey), stored, { merge: true });
    return stored;
  },
};
