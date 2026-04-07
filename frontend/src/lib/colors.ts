// RdWtBu diverging palette (color-blind safe)
// t=0 → blue (good)   t=0.5 → white (neutral)   t=1 → red (bad)
const BLUE:  [number, number, number] = [69,  117, 180];
const WHITE: [number, number, number] = [247, 247, 247];
const RED:   [number, number, number] = [215,  48,  39];

function lerp(a: number, b: number, s: number): number {
  return Math.round(a + (b - a) * s);
}

export function interpolateColor(t: number): string {
  const tc = Math.max(0, Math.min(1, t));
  let r: number, g: number, b: number;
  if (tc <= 0.5) {
    const s = tc * 2;
    r = lerp(BLUE[0], WHITE[0], s);
    g = lerp(BLUE[1], WHITE[1], s);
    b = lerp(BLUE[2], WHITE[2], s);
  } else {
    const s = (tc - 0.5) * 2;
    r = lerp(WHITE[0], RED[0], s);
    g = lerp(WHITE[1], RED[1], s);
    b = lerp(WHITE[2], RED[2], s);
  }
  return `rgb(${r},${g},${b})`;
}

// Returns background color for a cell value.
// lowerIsBetter=true means min value → blue (good), max → red (bad).
export function getMetricColor(
  value: number,
  allValues: number[],
  lowerIsBetter: boolean,
): string {
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const normalized = max === min ? 0.5 : (value - min) / (max - min);
  const t = lowerIsBetter ? normalized : 1 - normalized;
  return interpolateColor(t);
}

export function getTextColor(bgRgb: string): string {
  const nums = bgRgb.match(/\d+/g);
  if (!nums || nums.length < 3) return '#111827';
  const [r, g, b] = nums.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#111827' : '#f9fafb';
}
