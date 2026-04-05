const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
};

const buildDescription = (food) => {
  const nutrients = Array.isArray(food.foodNutrients) ? food.foodNutrients : [];
  const findNutrient = (...names) => {
    const match = nutrients.find((item) => names.includes(item.nutrientName));
    return match?.value;
  };

  const calories = findNutrient('Energy') ?? findNutrient('Energy (Atwater General Factors)');
  const protein = findNutrient('Protein');
  const carbs = findNutrient('Carbohydrate, by difference');
  const fat = findNutrient('Total lipid (fat)');

  const servingParts = [];
  if (food.servingSize) {
    servingParts.push(`${food.servingSize} ${food.servingSizeUnit || 'g'}`);
  }
  if (food.householdServingFullText) {
    servingParts.push(food.householdServingFullText);
  }

  const serving = servingParts[0] || 'Serving size unavailable';
  const numberOrZero = (value) => (typeof value === 'number' ? value : 0);

  return `${serving} - Calories: ${Math.round(numberOrZero(calories))}kcal | Fat: ${numberOrZero(fat).toFixed(1)}g | Carbs: ${numberOrZero(carbs).toFixed(1)}g | Protein: ${numberOrZero(protein).toFixed(1)}g`;
};

const mapFood = (food) => ({
  food_id: String(food.fdcId),
  food_name: food.description,
  food_description: buildDescription(food),
  brand_name: food.brandOwner || food.brandName || undefined,
  food_type: food.dataType || 'Generic',
  food_url: '',
});

module.exports = async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  try {
    const { query = '', maxResults = 10 } = parseBody(req);
    const normalizedQuery = String(query).trim();
    const limitedMaxResults = Math.min(Math.max(Number(maxResults) || 10, 1), 20);
    const apiKey = process.env.USDA_API_KEY;

    if (!apiKey) {
      res.status(500).json({ message: 'USDA_API_KEY is missing.' });
      return;
    }

    if (normalizedQuery.length < 3) {
      res.status(400).json({ message: 'Query must be at least 3 characters long.' });
      return;
    }

    const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: normalizedQuery,
        pageSize: limitedMaxResults,
        dataType: ['Branded', 'Foundation', 'SR Legacy'],
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      res.status(502).json({ message: `USDA search failed: ${response.status} ${body}` });
      return;
    }

    const payload = JSON.parse(body);
    res.status(200).json({
      foods: {
        food: Array.isArray(payload.foods) ? payload.foods.map(mapFood) : [],
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unknown server error.',
    });
  }
};
