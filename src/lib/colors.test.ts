import { describe, it, expect } from 'vitest';
import { interpolateColor, getMetricColor, getTextColor } from './colors';

// ─── interpolateColor ──────────────────────────────────────────

describe('interpolateColor', () => {
  it('returns blue at t=0 (best)', () => {
    expect(interpolateColor(0)).toBe('rgb(69,117,180)');
  });

  it('returns near-white at t=0.5 (neutral)', () => {
    expect(interpolateColor(0.5)).toBe('rgb(247,247,247)');
  });

  it('returns red at t=1 (worst)', () => {
    expect(interpolateColor(1)).toBe('rgb(215,48,39)');
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

  it('lowerIsBetter=false: max value → blue (best)', () => {
    // value=10 is best → t=0 → blue
    expect(getMetricColor(10, values, false)).toBe('rgb(69,117,180)');
  });

  it('lowerIsBetter=false: min value → red (worst)', () => {
    // value=1 is worst → t=1 → red
    expect(getMetricColor(1, values, false)).toBe('rgb(215,48,39)');
  });

  it('lowerIsBetter=true: min value → blue (best)', () => {
    // value=1 is best when lower is better → t=0 → blue
    expect(getMetricColor(1, values, true)).toBe('rgb(69,117,180)');
  });

  it('lowerIsBetter=true: max value → red (worst)', () => {
    // value=10 is worst when lower is better → t=1 → red
    expect(getMetricColor(10, values, true)).toBe('rgb(215,48,39)');
  });

  it('returns neutral when all values are equal', () => {
    // degenerate case: all same → normalized=0.5
    expect(getMetricColor(5, [5, 5, 5], false)).toBe('rgb(247,247,247)');
  });

  it('middle value gets intermediate color', () => {
    const color = getMetricColor(5, values, false);
    // not blue and not red — some intermediate
    expect(color).not.toBe('rgb(69,117,180)');
    expect(color).not.toBe('rgb(215,48,39)');
  });
});

// ─── getTextColor ─────────────────────────────────────────────

describe('getTextColor', () => {
  it('returns dark text on light background', () => {
    // white background: high luminance → dark text
    expect(getTextColor('rgb(247,247,247)')).toBe('#111827');
    expect(getTextColor('rgb(255,255,255)')).toBe('#111827');
  });

  it('returns light text on dark background', () => {
    // dark blue: low luminance → light text
    expect(getTextColor('rgb(69,117,180)')).toBe('#f9fafb');
    expect(getTextColor('rgb(0,0,0)')).toBe('#f9fafb');
  });

  it('returns light text on red background', () => {
    expect(getTextColor('rgb(215,48,39)')).toBe('#f9fafb');
  });

  it('handles malformed input gracefully', () => {
    // falls back to dark text
    expect(getTextColor('invalid')).toBe('#111827');
    expect(getTextColor('')).toBe('#111827');
  });
});
