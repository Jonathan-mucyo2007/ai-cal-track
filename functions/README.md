## Firebase Functions Setup

This backend moves AI provider keys and FatSecret credentials out of the Expo client and into Firebase Functions.

### 1. Install tooling

```bash
npm install -g firebase-tools
cd functions
npm install
```

### 2. Log in and initialize Firebase functions

From the project root:

```bash
firebase login
firebase init functions
```

Choose:
- existing project: `jonathan2026-eb182`
- language: JavaScript
- Node runtime: `20`

If Firebase creates files that overlap with this folder, keep the code in this `functions` directory.

### 3. Set secrets

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set FATSECRET_CLIENT_ID
firebase functions:secrets:set FATSECRET_CLIENT_SECRET
```

Only set the providers you actually want to use, but set both FatSecret secrets if you want food search to work.

### 4. Deploy

```bash
cd functions
npm run deploy
```

### 5. Configure the Expo app

Add this to the root `.env`:

```bash
EXPO_PUBLIC_AI_COACH_ENDPOINT=https://us-central1-jonathan2026-eb182.cloudfunctions.net/generateAiCoachLayer
EXPO_PUBLIC_FATSECRET_SEARCH_ENDPOINT=https://us-central1-jonathan2026-eb182.cloudfunctions.net/searchFatSecretFoods
```

Then restart Expo.

### Notes

- The backend caches AI coach responses in Firestore under `aiCoachCache`.
- Provider attempts are logged in `aiCoachLogs`.
- FatSecret food search must go through the backend because direct mobile requests can be rejected by FatSecret with IP validation errors.
- The mobile app still works without the AI coach backend by falling back to local coaching text, but production should use the backend endpoint.
