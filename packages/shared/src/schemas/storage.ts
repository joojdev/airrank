import { z } from "zod";
import { CategorySchema, DifficultySchema, MetricIdSchema } from "./item";

export const SelectionSchema = z.object({
  category: CategorySchema,
  metric: MetricIdSchema,
  difficulty: DifficultySchema,
});
export type Selection = z.infer<typeof SelectionSchema>;

export const LanguageSchema = z.enum(["pt-BR", "en"]);
export type Language = z.infer<typeof LanguageSchema>;

export const BestScoresSchema = z.record(z.string(), z.number().int().nonnegative());
export type BestScores = z.infer<typeof BestScoresSchema>;
