/**
 * Tests for CLI option parsing and validation.
 */
import { describe, expect, it } from 'vitest';
import { InvalidOptionError, parseMinScore, parseWeights } from '../src/cli/options.js';

describe('parseWeights', () => {
  it('should parse valid key=value pairs into a weight map', () => {
    expect(parseWeights('type_coverage=20,test_narration=5')).toEqual({
      type_coverage: 20,
      test_narration: 5,
    });
  });

  it('should tolerate whitespace around keys and values', () => {
    expect(parseWeights(' type_coverage = 20 ')).toEqual({ type_coverage: 20 });
  });

  it('should reject unknown dimension names instead of silently ignoring them', () => {
    expect(() => parseWeights('type_covrage=20')).toThrow(InvalidOptionError);
    expect(() => parseWeights('type_covrage=20')).toThrow(/Unknown dimension/);
  });

  it('should reject non-numeric weight values', () => {
    expect(() => parseWeights('type_coverage=abc')).toThrow(/Invalid weight/);
  });

  it('should reject negative weight values', () => {
    expect(() => parseWeights('type_coverage=-5')).toThrow(/Invalid weight/);
  });

  it('should reject entries without an equals sign', () => {
    expect(() => parseWeights('type_coverage')).toThrow(/key=value/);
  });

  it('should reject input that yields no entries at all', () => {
    expect(() => parseWeights(' , ,')).toThrow(/No valid --weights entries/);
  });
});

describe('parseMinScore', () => {
  it('should parse a valid number within 0-100', () => {
    expect(parseMinScore('70')).toBe(70);
    expect(parseMinScore('0')).toBe(0);
    expect(parseMinScore('100')).toBe(100);
    expect(parseMinScore('72.5')).toBe(72.5);
  });

  it('should reject values outside 0-100', () => {
    expect(() => parseMinScore('101')).toThrow(InvalidOptionError);
    expect(() => parseMinScore('-1')).toThrow(InvalidOptionError);
  });

  it('should reject non-numeric input instead of producing NaN', () => {
    expect(() => parseMinScore('seventy')).toThrow(/Expected a number/);
  });
});
