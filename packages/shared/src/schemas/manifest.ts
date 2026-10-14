import { z } from "zod";
import { CategorySchema, MetricIdSchema } from "./item";

export const SCHEMA_VERSION = 1;

export const ManifestSchema = z.object({
  schemaVersion: z.number().int(),
  generatedAt: z.string().datetime(),
  sample: z.boolean().optional(),
  categories: z.record(CategorySchema, z.object({ file: z.string(), itemCount: z.number().int() })),
  metrics: z.array(z.object({ id: MetricIdSchema, itemCount: z.number().int().nonnegative() })),
  minimumItems: z.number().int().positive(),
});
export type Manifest = z.infer<typeof ManifestSchema>;

export const PendingItemSchema = z.object({
  id: z.string(),
  category: CategorySchema,
  name: z.string(),
  code: z.string(),
  wikidataId: z.string(),
  reason: z.enum(["no-photo", "unfree-license", "bad-aspect"]),
  metrics: z.record(MetricIdSchema, z.number()),
});
export type PendingItem = z.infer<typeof PendingItemSchema>;

export const CoverageReportSchema = z.record(
  MetricIdSchema,
  z.object({
    eligible: z.number().int(),
    withValue: z.number().int(),
    withPhoto: z.number().int(),
    final: z.number().int(),
    meetsMinimum: z.boolean(),
  }),
);
export type CoverageReport = z.infer<typeof CoverageReportSchema>;
