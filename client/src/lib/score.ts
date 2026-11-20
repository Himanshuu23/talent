import type { ScoreInfo } from "./types";

/**
 * Overall score shown on stage and in the results tab.
 *  - audience votes (1-10) are averaged
 *  - if the host also scored, the overall is the mean of audience average and host score
 *  - otherwise whichever one exists is used
 */
export function overallScore(info?: ScoreInfo | null): number | null {
  if (!info) return null;
  const hasAudience = info.viewerCount > 0;
  if (hasAudience && info.hasAdminScore) {
    return Math.round(((info.viewerAverage + info.adminScore) / 2) * 10) / 10;
  }
  if (info.hasAdminScore) return info.adminScore;
  if (hasAudience) return info.viewerAverage;
  return null;
}

export function formatMoney(value: number | undefined | null) {
  return `$${Number(value || 0).toFixed(2)}`;
}
