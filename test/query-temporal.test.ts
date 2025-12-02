/**
 * Tests for Temporal Query Functions
 *
 * Tests date parsing, relative time expressions, and temporal comparisons.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseTemporalLiteral,
  parseDuration,
  durationToMilliseconds,
  addDuration,
  subtractDuration,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  toTemporalValue,
  compareTemporalValues,
  isBefore,
  isAfter,
  isBetween,
  isDaysAgo,
  isWeeksAgo,
  isMonthsAgo,
  isYearsAgo,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  evaluateTemporalOperator,
  isTemporalOperator,
  isTemporalLiteral
} from '../dist/query/temporal-evaluator.js';

describe('parseTemporalLiteral()', () => {
  describe('Named dates', () => {
    it('should parse @now', () => {
      const before = Date.now();
      const result = parseTemporalLiteral('@now');
      const after = Date.now();

      assert.ok(result.timestamp >= before);
      assert.ok(result.timestamp <= after);
      assert.ok(result.isRelative);
    });

    it('should parse @today', () => {
      const result = parseTemporalLiteral('@today');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      assert.strictEqual(result.date.getDate(), today.getDate());
      assert.strictEqual(result.date.getHours(), 0);
      assert.strictEqual(result.date.getMinutes(), 0);
    });

    it('should parse @yesterday', () => {
      const result = parseTemporalLiteral('@yesterday');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      assert.strictEqual(result.date.getDate(), yesterday.getDate());
    });

    it('should parse @tomorrow', () => {
      const result = parseTemporalLiteral('@tomorrow');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      assert.strictEqual(result.date.getDate(), tomorrow.getDate());
    });

    it('should parse case-insensitively', () => {
      const result1 = parseTemporalLiteral('@NOW');
      const result2 = parseTemporalLiteral('@Today');
      assert.ok(result1.timestamp);
      assert.ok(result2.timestamp);
    });
  });

  describe('Relative expressions', () => {
    it('should parse @now-7d (7 days ago)', () => {
      const now = new Date();
      const result = parseTemporalLiteral('@now-7d');

      const expected = new Date(now);
      expected.setDate(expected.getDate() - 7);

      // Allow 1 second tolerance
      assert.ok(Math.abs(result.timestamp - expected.getTime()) < 1000);
    });

    it('should parse @now+1w (1 week from now)', () => {
      const now = new Date();
      const result = parseTemporalLiteral('@now+1w');

      const expected = new Date(now);
      expected.setDate(expected.getDate() + 7);

      assert.ok(Math.abs(result.timestamp - expected.getTime()) < 1000);
    });

    it('should parse @now-3M (3 months ago)', () => {
      const now = new Date();
      const result = parseTemporalLiteral('@now-3M');

      const expected = new Date(now);
      expected.setMonth(expected.getMonth() - 3);

      // Allow 60 seconds tolerance for month calculations (DST, month boundaries)
      assert.ok(Math.abs(result.timestamp - expected.getTime()) < 60000);
    });

    it('should parse @now-1y (1 year ago)', () => {
      const now = new Date();
      const result = parseTemporalLiteral('@now-1y');

      const expected = new Date(now);
      expected.setFullYear(expected.getFullYear() - 1);

      // Allow 60 seconds tolerance for year calculations (DST, leap years)
      assert.ok(Math.abs(result.timestamp - expected.getTime()) < 60000);
    });

    it('should parse hours', () => {
      const result = parseTemporalLiteral('@now-2h');
      assert.ok(result.isRelative);
    });

    it('should parse minutes', () => {
      const result = parseTemporalLiteral('@now-30min');
      assert.ok(result.isRelative);
    });
  });

  describe('ISO 8601 dates', () => {
    it('should parse date only', () => {
      const result = parseTemporalLiteral('@2025-01-15');
      assert.strictEqual(result.date.getFullYear(), 2025);
      assert.strictEqual(result.date.getMonth(), 0); // January
      assert.strictEqual(result.date.getDate(), 15);
    });

    it('should parse datetime', () => {
      const result = parseTemporalLiteral('@2025-06-15T10:30:00');
      assert.strictEqual(result.date.getFullYear(), 2025);
      assert.strictEqual(result.date.getMonth(), 5); // June
      assert.strictEqual(result.date.getDate(), 15);
    });

    it('should parse datetime with Z timezone', () => {
      const result = parseTemporalLiteral('@2025-01-15T10:30:00Z');
      assert.ok(result.iso.includes('T'));
    });

    it('should parse year-month', () => {
      const result = parseTemporalLiteral('@2025-06');
      assert.strictEqual(result.date.getFullYear(), 2025);
      assert.strictEqual(result.date.getMonth(), 5);
    });
  });

  describe('Error handling', () => {
    it('should throw for empty literal', () => {
      assert.throws(() => parseTemporalLiteral('@'));
    });

    it('should throw for invalid format', () => {
      assert.throws(() => parseTemporalLiteral('@invalid'));
    });
  });

  describe('Without @ prefix', () => {
    it('should parse without @ prefix', () => {
      const result = parseTemporalLiteral('now');
      assert.ok(result.timestamp);
    });

    it('should parse ISO date without @ prefix', () => {
      const result = parseTemporalLiteral('2025-01-15');
      assert.strictEqual(result.date.getFullYear(), 2025);
    });
  });
});

describe('parseDuration()', () => {
  it('should parse year duration', () => {
    const d = parseDuration('P1Y');
    assert.strictEqual(d.years, 1);
  });

  it('should parse month duration', () => {
    const d = parseDuration('P2M');
    assert.strictEqual(d.months, 2);
  });

  it('should parse day duration', () => {
    const d = parseDuration('P10D');
    assert.strictEqual(d.days, 10);
  });

  it('should parse time duration', () => {
    const d = parseDuration('PT1H30M');
    assert.strictEqual(d.hours, 1);
    assert.strictEqual(d.minutes, 30);
  });

  it('should parse full duration', () => {
    const d = parseDuration('P1Y2M3DT4H5M6S');
    assert.strictEqual(d.years, 1);
    assert.strictEqual(d.months, 2);
    assert.strictEqual(d.days, 3);
    assert.strictEqual(d.hours, 4);
    assert.strictEqual(d.minutes, 5);
    assert.strictEqual(d.seconds, 6);
  });

  it('should parse week duration', () => {
    const d = parseDuration('P2W');
    assert.strictEqual(d.weeks, 2);
  });

  it('should handle @ prefix', () => {
    const d = parseDuration('@P1D');
    assert.strictEqual(d.days, 1);
  });

  it('should throw for invalid format', () => {
    assert.throws(() => parseDuration('invalid'));
  });
});

describe('durationToMilliseconds()', () => {
  it('should convert seconds', () => {
    const d = { years: 0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 1, milliseconds: 0 };
    assert.strictEqual(durationToMilliseconds(d), 1000);
  });

  it('should convert minutes', () => {
    const d = { years: 0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 1, seconds: 0, milliseconds: 0 };
    assert.strictEqual(durationToMilliseconds(d), 60000);
  });

  it('should convert hours', () => {
    const d = { years: 0, months: 0, weeks: 0, days: 0, hours: 1, minutes: 0, seconds: 0, milliseconds: 0 };
    assert.strictEqual(durationToMilliseconds(d), 3600000);
  });

  it('should convert days', () => {
    const d = { years: 0, months: 0, weeks: 0, days: 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
    assert.strictEqual(durationToMilliseconds(d), 86400000);
  });
});

describe('addDuration() and subtractDuration()', () => {
  it('should add days', () => {
    const date = new Date('2025-01-15');
    const d = parseDuration('P5D');
    const result = addDuration(date, d);
    assert.strictEqual(result.getDate(), 20);
  });

  it('should subtract days', () => {
    const date = new Date('2025-01-15');
    const d = parseDuration('P5D');
    const result = subtractDuration(date, d);
    assert.strictEqual(result.getDate(), 10);
  });

  it('should add months', () => {
    const date = new Date('2025-01-15');
    const d = parseDuration('P2M');
    const result = addDuration(date, d);
    assert.strictEqual(result.getMonth(), 2); // March
  });

  it('should add years', () => {
    const date = new Date('2025-01-15');
    const d = parseDuration('P1Y');
    const result = addDuration(date, d);
    assert.strictEqual(result.getFullYear(), 2026); // 2025 + 1 year = 2026
  });
});

describe('Date utility functions', () => {
  describe('startOfDay() and endOfDay()', () => {
    it('should get start of day', () => {
      const result = startOfDay(new Date('2025-06-15T14:30:00'));
      assert.strictEqual(result.getHours(), 0);
      assert.strictEqual(result.getMinutes(), 0);
      assert.strictEqual(result.getSeconds(), 0);
    });

    it('should get end of day', () => {
      const result = endOfDay(new Date('2025-06-15T14:30:00'));
      assert.strictEqual(result.getHours(), 23);
      assert.strictEqual(result.getMinutes(), 59);
      assert.strictEqual(result.getSeconds(), 59);
    });
  });

  describe('startOfWeek() and endOfWeek()', () => {
    it('should get start of week (Monday)', () => {
      const result = startOfWeek(new Date('2025-06-15')); // Saturday
      assert.strictEqual(result.getDay(), 1); // Monday
    });

    it('should get end of week (Sunday)', () => {
      const result = endOfWeek(new Date('2025-06-15'));
      assert.strictEqual(result.getDay(), 0); // Sunday
    });
  });

  describe('startOfMonth() and endOfMonth()', () => {
    it('should get start of month', () => {
      const result = startOfMonth(new Date('2025-06-15'));
      assert.strictEqual(result.getDate(), 1);
    });

    it('should get end of month', () => {
      const result = endOfMonth(new Date('2025-06-15'));
      assert.strictEqual(result.getDate(), 30); // June has 30 days
    });

    it('should handle February correctly', () => {
      const result = endOfMonth(new Date('2025-02-15'));
      assert.strictEqual(result.getDate(), 28); // 2025 is NOT a leap year (2024 was)
    });
  });

  describe('startOfYear() and endOfYear()', () => {
    it('should get start of year', () => {
      const result = startOfYear(new Date('2025-06-15'));
      assert.strictEqual(result.getMonth(), 0);
      assert.strictEqual(result.getDate(), 1);
    });

    it('should get end of year', () => {
      const result = endOfYear(new Date('2025-06-15'));
      assert.strictEqual(result.getMonth(), 11);
      assert.strictEqual(result.getDate(), 31);
    });
  });
});

describe('toTemporalValue()', () => {
  it('should convert Date object', () => {
    const date = new Date('2025-06-15');
    const result = toTemporalValue(date);
    assert.ok(result);
    assert.strictEqual(result!.timestamp, date.getTime());
  });

  it('should convert timestamp number', () => {
    const timestamp = Date.now();
    const result = toTemporalValue(timestamp);
    assert.ok(result);
    assert.strictEqual(result!.timestamp, timestamp);
  });

  it('should convert ISO string', () => {
    const result = toTemporalValue('2025-06-15');
    assert.ok(result);
    assert.strictEqual(result!.date.getFullYear(), 2025);
  });

  it('should convert temporal literal string', () => {
    const result = toTemporalValue('@now-7d');
    assert.ok(result);
    assert.ok(result!.isRelative);
  });

  it('should return null for null/undefined', () => {
    assert.strictEqual(toTemporalValue(null), null);
    assert.strictEqual(toTemporalValue(undefined), null);
  });

  it('should return null for invalid string', () => {
    assert.strictEqual(toTemporalValue('not a date'), null);
  });
});

describe('compareTemporalValues()', () => {
  it('should return negative for earlier date', () => {
    const a = parseTemporalLiteral('@2025-01-01');
    const b = parseTemporalLiteral('@2025-12-31');
    assert.ok(compareTemporalValues(a, b) < 0);
  });

  it('should return positive for later date', () => {
    const a = parseTemporalLiteral('@2025-12-31');
    const b = parseTemporalLiteral('@2025-01-01');
    assert.ok(compareTemporalValues(a, b) > 0);
  });

  it('should return 0 for same date', () => {
    const a = parseTemporalLiteral('@2025-06-15');
    const b = parseTemporalLiteral('@2025-06-15');
    assert.strictEqual(compareTemporalValues(a, b), 0);
  });
});

describe('Temporal comparison functions', () => {
  describe('isBefore()', () => {
    it('should return true for earlier date', () => {
      assert.ok(isBefore('2025-01-01', '2025-12-31'));
    });

    it('should return false for later date', () => {
      assert.ok(!isBefore('2025-12-31', '2025-01-01'));
    });

    it('should return false for same date', () => {
      assert.ok(!isBefore('2025-06-15', '2025-06-15'));
    });

    it('should handle temporal literals', () => {
      assert.ok(isBefore('@yesterday', '@today'));
    });
  });

  describe('isAfter()', () => {
    it('should return true for later date', () => {
      assert.ok(isAfter('2025-12-31', '2025-01-01'));
    });

    it('should return false for earlier date', () => {
      assert.ok(!isAfter('2025-01-01', '2025-12-31'));
    });
  });

  describe('isBetween()', () => {
    it('should return true for date in range', () => {
      assert.ok(isBetween('2025-06-15', '2025-01-01', '2025-12-31'));
    });

    it('should return true for date at start', () => {
      assert.ok(isBetween('2025-01-01', '2025-01-01', '2025-12-31'));
    });

    it('should return true for date at end', () => {
      assert.ok(isBetween('2025-12-31', '2025-01-01', '2025-12-31'));
    });

    it('should return false for date outside range', () => {
      assert.ok(!isBetween('2024-12-31', '2025-01-01', '2025-12-31')); // Before range
    });
  });

  describe('isDaysAgo()', () => {
    it('should return true for recent date', () => {
      const recent = new Date();
      recent.setDate(recent.getDate() - 3);
      assert.ok(isDaysAgo(recent, 7));
    });

    it('should return false for old date', () => {
      const old = new Date();
      old.setDate(old.getDate() - 30);
      assert.ok(!isDaysAgo(old, 7));
    });
  });

  describe('isWeeksAgo()', () => {
    it('should return true for date within weeks', () => {
      const recent = new Date();
      recent.setDate(recent.getDate() - 10);
      assert.ok(isWeeksAgo(recent, 2));
    });
  });

  describe('isMonthsAgo()', () => {
    it('should return true for date within months', () => {
      const recent = new Date();
      recent.setMonth(recent.getMonth() - 2);
      assert.ok(isMonthsAgo(recent, 3));
    });
  });

  describe('isYearsAgo()', () => {
    it('should return true for date within years', () => {
      const recent = new Date();
      recent.setFullYear(recent.getFullYear() - 1);
      assert.ok(isYearsAgo(recent, 2));
    });
  });

  describe('isSameDay()', () => {
    it('should return true for same day', () => {
      const a = new Date('2025-06-15T10:00:00');
      const b = new Date('2025-06-15T20:00:00');
      assert.ok(isSameDay(a, b));
    });

    it('should return false for different days', () => {
      const a = new Date('2025-06-15');
      const b = new Date('2025-06-16');
      assert.ok(!isSameDay(a, b));
    });
  });

  describe('isSameWeek()', () => {
    it('should return true for same week', () => {
      const a = new Date('2025-06-10'); // Monday
      const b = new Date('2025-06-14'); // Friday
      assert.ok(isSameWeek(a, b));
    });
  });

  describe('isSameMonth()', () => {
    it('should return true for same month', () => {
      assert.ok(isSameMonth('2025-06-01', '2025-06-30'));
    });

    it('should return false for different months', () => {
      assert.ok(!isSameMonth('2025-06-15', '2025-07-15'));
    });
  });

  describe('isSameYear()', () => {
    it('should return true for same year', () => {
      assert.ok(isSameYear('2025-01-01', '2025-12-31'));
    });

    it('should return false for different years', () => {
      assert.ok(!isSameYear('2025-06-15', '2026-06-15')); // Different years
    });
  });
});

describe('evaluateTemporalOperator()', () => {
  it('should evaluate before operator', () => {
    assert.ok(evaluateTemporalOperator('before', '2025-01-01', '2025-12-31'));
  });

  it('should evaluate after operator', () => {
    assert.ok(evaluateTemporalOperator('after', '2025-12-31', '2025-01-01'));
  });

  it('should evaluate between operator', () => {
    assert.ok(evaluateTemporalOperator('between', '2025-06-15', '2025-01-01', '2025-12-31'));
  });

  it('should evaluate daysAgo operator', () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 3);
    assert.ok(evaluateTemporalOperator('daysAgo', recent, 7));
  });

  it('should evaluate sameDay operator', () => {
    assert.ok(evaluateTemporalOperator('sameDay', '2025-06-15T10:00', '2025-06-15T20:00'));
  });

  it('should return false for unknown operator', () => {
    assert.ok(!evaluateTemporalOperator('unknown', 'a', 'b'));
  });
});

describe('isTemporalOperator()', () => {
  it('should recognize temporal operators', () => {
    assert.ok(isTemporalOperator('before'));
    assert.ok(isTemporalOperator('after'));
    assert.ok(isTemporalOperator('between'));
    assert.ok(isTemporalOperator('daysAgo'));
    assert.ok(isTemporalOperator('weeksAgo'));
    assert.ok(isTemporalOperator('monthsAgo'));
    assert.ok(isTemporalOperator('yearsAgo'));
    assert.ok(isTemporalOperator('sameDay'));
    assert.ok(isTemporalOperator('sameWeek'));
    assert.ok(isTemporalOperator('sameMonth'));
    assert.ok(isTemporalOperator('sameYear'));
  });

  it('should reject non-temporal operators', () => {
    assert.ok(!isTemporalOperator('=='));
    assert.ok(!isTemporalOperator('contains'));
    assert.ok(!isTemporalOperator('unknown'));
  });
});

describe('isTemporalLiteral()', () => {
  it('should recognize temporal literals', () => {
    assert.ok(isTemporalLiteral('@now'));
    assert.ok(isTemporalLiteral('@today'));
    assert.ok(isTemporalLiteral('@yesterday'));
    assert.ok(isTemporalLiteral('@tomorrow'));
    assert.ok(isTemporalLiteral('@now-7d'));
    assert.ok(isTemporalLiteral('@now+1w'));
    assert.ok(isTemporalLiteral('@2025-01-15'));
    assert.ok(isTemporalLiteral('@2025-01-15T10:30:00Z'));
    assert.ok(isTemporalLiteral('@P1D'));
  });

  it('should reject non-temporal literals', () => {
    assert.ok(!isTemporalLiteral('hello'));
    assert.ok(!isTemporalLiteral('@unknown'));
    assert.ok(!isTemporalLiteral('2025-01-15')); // No @ prefix
  });
});

describe('Security', () => {
  it('should reject very large offsets', () => {
    assert.throws(() => {
      parseTemporalLiteral('@now-99999d');
    });
  });
});
