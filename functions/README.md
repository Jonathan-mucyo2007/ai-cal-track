## Firebase Functions Setup

This backend moves AI provider keys out of the Expo client and into Firebase Functions.

Important:
- Run Firebase commands from [functions](d:/calori/ai-cal-track/functions), because that folder contains the deploy config.
- The live backend entry file is [index.js](d:/calori/ai-cal-track/functions/index.js). The scaffolded `functions/functions/` folder is not the backend you want to deploy.

### 1. Install tooling

```bash
npm install -g firebase-tools
cd functions
npm install
```

### 2. Log in and initialize Firebase functions

From the `functions` folder:

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
```

Only set the providers you actually want to use.

### 4. Deploy

```bash
cd functions
npm run deploy
```

### 5. Configure the Expo app

Add this to the root `.env`:

```bash
EXPO_PUBLIC_AI_COACH_ENDPOINT=https://us-central1-jonathan2026-eb182.cloudfunctions.net/generateAiCoachLayer
```

Then restart Expo.

### Notes

- The backend caches AI coach responses in Firestore under `aiCoachCache`.
- Provider attempts are logged in `aiCoachLogs`.
- Food search is now handled by the separate Vercel USDA proxy, not by Firebase Functions.
- The mobile app still works without the AI coach backend by falling back to local coaching text, but production should use the backend endpoint.
