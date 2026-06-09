// Pure helpers for { date, close } time series used by the evolution charts.

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  close: number;
}

/**
 * Merges multiple { date, close }[] series into one by summing them over the
 * union of their dates. Each series is forward-filled (its last known value
 * carries forward) so a date present in one series but not another still sums
 * correctly. Used by the dashboard to fold the three domains into one
 * net-worth line.
 */
export function mergeSeries(...series: SeriesPoint[][]): SeriesPoint[] {
  const nonEmpty = series.filter((s) => s.length > 0);
  if (nonEmpty.length === 0) return [];
  if (nonEmpty.length === 1) return nonEmpty[0];

  const dates = Array.from(
    new Set(nonEmpty.flatMap((s) => s.map((p) => p.date)))
  ).sort();

  // One forward-fill cursor per series; dates are processed in ascending
  // order, so each cursor only ever moves forward.
  const cursors = nonEmpty.map(() => ({ idx: 0, value: 0 }));

  return dates.map((d) => {
    let total = 0;
    for (let i = 0; i < nonEmpty.length; i++) {
      const s = nonEmpty[i];
      const c = cursors[i];
      while (c.idx < s.length && s[c.idx].date <= d) {
        c.value = s[c.idx].close;
        c.idx++;
      }
      total += c.value;
    }
    return { date: d, close: Math.round(total * 100) / 100 };
  });
}
