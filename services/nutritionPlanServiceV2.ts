import { aiCoachService } from './aiCoachService';
import { nutritionMathService, NutritionPlanRequest, NutritionPlanResult } from './nutritionMathService';

export type { NutritionPlanRequest, NutritionPlanResult } from './nutritionMathService';

export const nutritionPlanService = {
  async generatePlan(input: NutritionPlanRequest): Promise<NutritionPlanResult> {
    const basePlan = nutritionMathService.calculateBasePlan(input);
    const coachLayer = await aiCoachService.generateCoachLayer(input, basePlan);

    return {
      generatedAt: new Date().toISOString(),
      planSource: 'deterministic',
      coachSource: coachLayer.coachSource,
      providerModel: coachLayer.providerModel,
      dailyCalories: basePlan.dailyCalories,
      macros: basePlan.macros,
      dailyWaterLiters: basePlan.dailyWaterLiters,
      recommendations: coachLayer.recommendations,
      summary: coachLayer.summary,
    };
  },
};
