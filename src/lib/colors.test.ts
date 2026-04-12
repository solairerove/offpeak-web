import { describe, it, expect } from 'vitest';
import { interpolateColor, getMetricColor, getTextColor } from './colors';

// Current palette: teal-500 → white → rose-500
const TEAL  = 'rgb(20,184,166)';
const WHITE = 'rgb(247,247,247)';
const ROSE  = 'rgb(244,63,94)';

// ─── interpolateColor ──────────────────────────────────────────

describe('interpolateColor', () => {
  it('returns teal at t=0 (best)', () => {
    expect(interpolateColor(0)).toBe(TEAL);
  });

  it('returns white at t=0.5 (neutral)', () => {
    expect(interpolateColor(0.5)).toBe(WHITE);
  });

  it('returns rose at t=1 (worst)', () => {
    expect(interpolateColor(1)).toBe(ROSE);
  });

  it('clamps values below 0', () => {
    expect(interpolateColor(-1)).toBe(interpolateColor(0));
  });

  it('clamps values above 1', () => {
    expect(interpolateColor(2)).toBe(interpolateColor(1));
  });

  it('returns valid rgb() string for any t in [0,1]', () => {
    for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(interpolateColor(t)).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    }
  });
});

// ─── getMetricColor ────────────────────────────────────────────

describe('getMetricColor', () => {
  const values = [1, 5, 10];

  it('lowerIsBetter=false: max value → teal (best)', () => {
    expect(getMetricColor(10, values, false)).toBe(TEAL);
  });

  it('lowerIsBetter=false: min value → rose (worst)', () => {
    expect(getMetricColor(1, values, false)).toBe(ROSE);
  });

  it('lowerIsBetter=true: min value → teal (best)', () => {
    expect(getMetricColor(1, values, true)).toBe(TEAL);
  });

  it('lowerIsBetter=true: max value → rose (worst)', () => {
    expect(getMetricColor(10, values, true)).toBe(ROSE);
  });

  it('returns white when all values are equal (degenerate case)', () => {
    expect(getMetricColor(5, [5, 5, 5], false)).toBe(WHITE);
  });

  it('middle value gets intermediate color (not teal, not rose)', () => {
    const color = getMetricColor(5, values, false);
    expect(color).not.toBe(TEAL);
    expect(color).not.toBe(ROSE);
  });
});

// ─── getTextColor ─────────────────────────────────────────────

describe('getTextColor', () => {
  it('returns dark text on white/light background', () => {
    expect(getTextColor(WHITE)).toBe('#111827');
    expect(getTextColor('rgb(255,255,255)')).toBe('#111827');
  });

  it('returns light text on teal background', () => {
    // teal-500 luminance ≈ 0.52 < threshold 0.55 → light text
    expect(getTextColor(TEAL)).toBe('#f9fafb');
  });

  it('returns light text on rose background', () => {
    expect(getTextColor(ROSE)).toBe('#f9fafb');
  });

  it('returns light text on black', () => {
    expect(getTextColor('rgb(0,0,0)')).toBe('#f9fafb');
  });

  it('handles malformed input gracefully', () => {
    expect(getTextColor('invalid')).toBe('#111827');
    expect(getTextColor('')).toBe('#111827');
  });
});
