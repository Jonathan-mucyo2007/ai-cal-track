import { localFoodSearchService } from './localFoodSearchService';

export class FoodSearchError extends Error {
  code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = 'FoodSearchError';
    this.code = code;
  }
}

const FOOD_SEARCH_ENDPOINT = process.env.EXPO_PUBLIC_FATSECRET_SEARCH_ENDPOINT;

export interface FoodSearchResult {
  food_id: string;
  food_name: string;
  food_description: string;
  brand_name?: string;
  food_type: string;
  food_url: string;
}

export const foodSearchService = {
  async searchFood(query: string): Promise<FoodSearchResult[]> {
    if (query.trim().length < 3) {
      return [];
    }

    if (!FOOD_SEARCH_ENDPOINT) {
      console.warn('EXPO_PUBLIC_FATSECRET_SEARCH_ENDPOINT is not set. Using local food search fallback.');
      return localFoodSearchService.search(query);
    }

    try {
      const response = await fetch(FOOD_SEARCH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          maxResults: 10,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new FoodSearchError(
          data?.message || `Food search failed with status ${response.status}.`,
          data?.code
        );
      }

      const rawItems = data?.foods?.food;
      if (!rawItems) {
        return [];
      }

      return Array.isArray(rawItems) ? rawItems : [rawItems];
    } catch (error) {
      if (error instanceof FoodSearchError) {
        throw error;
      }

      console.error('Food search failed', error);
      throw new FoodSearchError('Unable to reach the food search service right now.');
    }
  }
};
