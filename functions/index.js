const crypto = require('crypto');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { defineSecret } = require('firebase-functions/params');
const OpenAI = require('openai').default || require('openai');

admin.initializeApp();

const openAiApiKey = defineSecret('OPENAI_API_KEY');
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

const db = admin.firestore();

const extractJsonBlock = (rawText) => {
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch && fencedMatch[1]) return fencedMatch[1];

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1);
  }

  return rawText;
};

const parseCoachResponse = (rawText, coachSource, providerModel) => {
  const parsed = JSON.parse(extractJsonBlock(rawText));

  return {
    coachSource,
    providerModel,
    summary: String(parsed.summary || ''),
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((item) => String(item)).slice(0, 5)
      : [],
  };
};

const buildCoachPrompt = (user, plan) => `
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

const getFallbackCoachLayer = (user, plan) => {
  const goalLabel =
    user.goal === 'lose' ? 'fat loss' : user.goal === 'gain' ? 'lean muscle gain' : 'maintenance and performance';

  return {
    coachSource: 'fallback',
    providerModel: 'local-rules-server',
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

const fetchWithRetry = async (url, init, retries = 2) => {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries.');
};

const requestOpenAI = async (prompt) => {
  const apiKey = openAiApiKey.value();
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an elite AI nutrition coach. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });

  const text = response.choices?.[0]?.message?.content || '';
  return parseCoachResponse(text, 'openai', 'gpt-4o-mini');
};

const requestGemini = async (prompt) => {
  const apiKey = geminiApiKey.value();
  if (!apiKey) return null;

  const model = 'gemini-1.5-flash';
  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  return parseCoachResponse(text, 'gemini', model);
};

const requestAnthropic = async () => {
  const apiKey = anthropicApiKey.value();
  if (!apiKey) return null;
  return null;
};

exports.generateAiCoachLayer = onRequest(
  {
    region: 'us-central1',
    cors: true,
    secrets: [openAiApiKey, geminiApiKey, anthropicApiKey],
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    const { user, plan } = request.body || {};
    if (!user || !plan) {
      response.status(400).send('Missing user or plan payload.');
      return;
    }

    const cacheKey = crypto.createHash('sha256').update(JSON.stringify({ user, plan })).digest('hex');
    const cacheRef = db.collection('aiCoachCache').doc(cacheKey);
    const logRef = db.collection('aiCoachLogs').doc();

    try {
      const cached = await cacheRef.get();
      if (cached.exists) {
        const data = cached.data();
        await logRef.set({
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          cacheHit: true,
          provider: data.providerModel || data.coachSource || 'unknown',
        });
        response.status(200).json(data);
        return;
      }

      const prompt = buildCoachPrompt(user, plan);
      const providers = [
        { name: 'openai', fn: () => requestOpenAI(prompt) },
        { name: 'gemini', fn: () => requestGemini(prompt) },
        { name: 'anthropic', fn: () => requestAnthropic(prompt) },
      ];

      for (const provider of providers) {
        try {
          const result = await provider.fn();
          if (result && result.summary && result.recommendations.length) {
            const payload = {
              ...result,
              cachedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            await cacheRef.set(payload, { merge: true });
            await logRef.set({
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              cacheHit: false,
              provider: provider.name,
              providerModel: result.providerModel || '',
              success: true,
            });

            response.status(200).json(result);
            return;
          }
        } catch (error) {
          logger.error(`AI coach provider failed: ${provider.name}`, error);
          await logRef.set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            cacheHit: false,
            provider: provider.name,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const fallback = getFallbackCoachLayer(user, plan);
      await cacheRef.set(
        {
          ...fallback,
          cachedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      response.status(200).json(fallback);
    } catch (error) {
      logger.error('generateAiCoachLayer failed', error);
      response.status(500).send(error instanceof Error ? error.message : 'Unknown server error.');
    }
  }
);
