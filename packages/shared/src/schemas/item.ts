import { z } from "zod";

export const CategorySchema = z.enum(["airport", "airline"]);
export type Category = z.infer<typeof CategorySchema>;

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const MetricIdSchema = z.enum([
  "passengers",
  "runways",
  "airlines",
  "destinations",
  "countries",
  "founded",
]);
export type MetricId = z.infer<typeof MetricIdSchema>;

export const PhotoSchema = z.object({
  widths: z.array(z.number().int().positive()).min(1),
  formats: z.array(z.enum(["avif", "webp"])).min(1),
  author: z.string().min(1),
  license: z.string().min(1),
  licenseUrl: z.string().url(),
  sourceUrl: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type Photo = z.infer<typeof PhotoSchema>;

const CATEGORY_METRICS: Record<Category, readonly MetricId[]> = {
  airport: ["passengers", "runways", "airlines"],
  airline: ["destinations", "countries", "founded"],
};

export const ItemSchema = z
  .object({
    id: z.string().min(1),
    category: CategorySchema,
    name: z.string().min(1),
    code: z.string().min(1),
    country: z.string().length(2).nullable(),
    photo: PhotoSchema,
    metrics: z.record(MetricIdSchema, z.number().finite()),
  })
  .superRefine((item, ctx) => {
    const entries = Object.entries(item.metrics) as [MetricId, number][];
    if (entries.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "item needs at least one metric",
        path: ["metrics"],
      });
    }
    for (const [id, value] of entries) {
      if (!CATEGORY_METRICS[item.category].includes(id)) {
        ctx.addIssue({
          code: "custom",
          message: `metric ${id} does not belong to ${item.category}`,
          path: ["metrics", id],
        });
      }
      if (id === "founded" ? !Number.isInteger(value) : value <= 0) {
        ctx.addIssue({
          code: "custom",
          message: id === "founded" ? "founded must be an integer year" : `${id} must be positive`,
          path: ["metrics", id],
        });
      }
    }
  });
export type Item = z.infer<typeof ItemSchema>;
