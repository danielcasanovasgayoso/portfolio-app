export type SSEEvent =
  | { type: "start"; total: number }
  | { type: "price_updated"; assetId: string; ticker: string }
  | { type: "price_error"; assetId: string; ticker: string; error: string }
  | { type: "done"; updated: number; errors: number };
