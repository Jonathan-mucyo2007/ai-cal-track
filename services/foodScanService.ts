type FoodScanCapture = {
  id: string;
  imageUri: string;
  imageBase64: string;
  mimeType: string;
};

export type FoodScanAnalysisResult = {
  dishName: string;
  caloriesKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  estimatedServing: string;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
};

const scanCaptureStore = new Map<string, FoodScanCapture>();
const scanResultStore = new Map<string, FoodScanAnalysisResult>();

const geminiApiKey =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  process.env.EXPO_PUBLIC_GEMIN_API_KEY ||
  process.env.GEMIN_API_KEY ||
  '';

const modelCandidates = [
  process.env.EXPO_PUBLIC_GEMINI_VISION_MODEL || 'gemini-2.5-flash-lite',
  'gemini-2.5-flash-lite',
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

const normalizeNumber = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Number(numeric.toFixed(1)));
};

const normalizeResult = (rawText: string): FoodScanAnalysisResult => {
  const parsed = JSON.parse(extractJsonBlock(rawText));

  return {
    dishName: String(parsed.dishName || parsed.foodName || 'Detected Food'),
    caloriesKcal: Math.round(normalizeNumber(parsed.caloriesKcal ?? parsed.calories)),
    proteinGrams: normalizeNumber(parsed.proteinGrams ?? parsed.protein),
    carbsGrams: normalizeNumber(parsed.carbsGrams ?? parsed.carbs),
    fatsGrams: normalizeNumber(parsed.fatsGrams ?? parsed.fat ?? parsed.fats),
    estimatedServing: String(parsed.estimatedServing || parsed.servingSize || '1 serving'),
    confidence:
      parsed.confidence === 'low' || parsed.confidence === 'medium' || parsed.confidence === 'high'
        ? parsed.confidence
        : 'medium',
    reasoning: String(parsed.reasoning || 'AI estimated this meal from the visual appearance of the food.'),
  };
};

const buildPrompt = () => `
You are a food recognition and nutrition estimation assistant.

Analyze the meal image and return your best estimate of the most likely food or dish shown.

Rules:
- Return valid JSON only.
- Use kcal for calories.
- Estimate a realistic single serving shown in the image.
- Keep macros practical and non-negative.
- Do not add markdown or explanation outside the JSON.

Use exactly this shape:
{
  "dishName": "string",
  "estimatedServing": "string",
  "caloriesKcal": 0,
  "proteinGrams": 0,
  "carbsGrams": 0,
  "fatsGrams": 0,
  "confidence": "low | medium | high",
  "reasoning": "short string"
}
`;

const requestGeminiVision = async (capture: FoodScanCapture) => {
  if (!geminiApiKey) {
    throw new Error('Missing Gemini API key. Add EXPO_PUBLIC_GEMINI_API_KEY or EXPO_PUBLIC_GEMIN_API_KEY to your .env file.');
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
              parts: [
                { text: buildPrompt() },
                {
                  inline_data: {
                    mime_type: capture.mimeType,
                    data: capture.imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
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
      throw new Error(lastError);
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('') || '';

    if (!text.trim()) {
      lastError = `Gemini returned an empty response for ${model}.`;
      continue;
    }

    return normalizeResult(text);
  }

  throw new Error(lastError || 'Gemini vision could not analyze the image.');
};

export const foodScanService = {
  createCapture(payload: Omit<FoodScanCapture, 'id'>) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    scanCaptureStore.set(id, { id, ...payload });
    return id;
  },

  getCapture(scanId: string) {
    return scanCaptureStore.get(scanId) || null;
  },

  clearCapture(scanId: string) {
    scanCaptureStore.delete(scanId);
  },

  getResult(scanId: string) {
    return scanResultStore.get(scanId) || null;
  },

  async analyze(scanId: string) {
    const capture = scanCaptureStore.get(scanId);
    if (!capture) {
      throw new Error('Food scan image is no longer available. Please capture or select it again.');
    }

    const result = await requestGeminiVision(capture);
    scanResultStore.set(scanId, result);
    return result;
  },
};
