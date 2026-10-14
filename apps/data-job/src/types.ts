import type { Category, MetricId } from "@agg/shared";

/** An item that passed eligibility, before photo resolution. */
export interface Candidate {
  category: Category;
  wikidataId: string;
  name: string;
  code: string;
  country: string | null;
  metrics: Partial<Record<MetricId, number>>;
  /** Commons file name from Wikidata P18, if any. */
  imageFile: string | null;
  /** Ranking used only to cap the dataset size. */
  fame: number;
}
