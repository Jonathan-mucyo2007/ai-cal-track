import { FoodSearchResult } from './fatSecretService';

const LOCAL_FOODS: FoodSearchResult[] = [
  {
    food_id: 'local-apple',
    food_name: 'Apple',
    food_description: '1 medium apple - Calories: 95kcal | Fat: 0.3g | Carbs: 25g | Protein: 0.5g',
    food_type: 'Generic',
    food_url: '',
  },
  {
    food_id: 'local-banana',
    food_name: 'Banana',
    food_description: '1 medium banana - Calories: 105kcal | Fat: 0.4g | Carbs: 27g | Protein: 1.3g',
    food_type: 'Generic',
    food_url: '',
  },
  {
    food_id: 'local-rice',
    food_name: 'Cooked White Rice',
    food_description: '1 cup cooked - Calories: 205kcal | Fat: 0.4g | Carbs: 45g | Protein: 4.3g',
    food_type: 'Generic',
    food_url: '',
  },
  {
    food_id: 'local-chicken',
    food_name: 'Chicken Breast',
    food_description: '100g cooked - Calories: 165kcal | Fat: 3.6g | Carbs: 0g | Protein: 31g',
    food_type: 'Generic',
    food_url: '',
  },
  {
    food_id: 'local-egg',
    food_name: 'Egg',
    food_description: '1 large egg - Calories: 78kcal | Fat: 5g | Carbs: 0.6g | Protein: 6g',
    food_type: 'Generic',
    food_url: '',
  },
  {
    food_id: 'local-oats',
    food_name: 'Oatmeal',
    food_description: '1 cup cooked - Calories: 154kcal | Fat: 2.6g | Carbs: 27g | Protein: 5.5g',
    food_type: 'Generic',
    food_url: '',
  },
  {
    food_id: 'local-bread',
    food_name: 'Whole Wheat Bread',
    food_description: '2 slices - Calories: 160kcal | Fat: 2g | Carbs: 28g | Protein: 8g',
    food_type: 'Generic',
    food_url: '',
  },
  {
    food_id: 'local-milk',
    food_name: 'Milk',
    food_description: '1 cup - Calories: 122kcal | Fat: 4.8g | Carbs: 12g | Protein: 8g',
    food_type: 'Generic',
    food_url: '',
  },
  {
    food_id: 'local-pasta',
    food_name: 'Cooked Pasta',
    food_description: '1 cup cooked - Calories: 221kcal | Fat: 1.3g | Carbs: 43g | Protein: 8g',
    food_type: 'Generic',
    food_url: '',
  },
  {
    food_id: 'local-avocado',
    food_name: 'Avocado',
    food_description: '1/2 medium avocado - Calories: 120kcal | Fat: 11g | Carbs: 6g | Protein: 1.5g',
    food_type: 'Generic',
    food_url: '',
  },
];

export const localFoodSearchService = {
  search(query: string): FoodSearchResult[] {
    const normalized = query.trim().toLowerCase();

    if (normalized.length < 3) {
      return [];
    }

    return LOCAL_FOODS.filter((food) => {
      const haystack = `${food.food_name} ${food.food_description} ${food.brand_name || ''}`.toLowerCase();
      return haystack.includes(normalized);
    }).slice(0, 8);
  },
};
