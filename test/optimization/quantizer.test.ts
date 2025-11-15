/**
 * Tests for numeric quantization optimization
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { NumericQuantizer } from '../../dist/optimization/quantizer.js';

describe('NumericQuantizer', () => {
  describe('analyzePrecision', () => {
    it('should analyze integer values', () => {
      const quantizer = new NumericQuantizer({ preserveIntegers: true });
      const values = [10, 20, 30, 40, 50];

      const analysis = quantizer.analyzePrecision(values);

      assert.strictEqual(analysis.hasDecimals, false);
      assert.strictEqual(analysis.suggestedPrecision, 0);
      assert.strictEqual(analysis.minValue, 10);
      assert.strictEqual(analysis.maxValue, 50);
    });

    it('should analyze decimal values', () => {
      const quantizer = new NumericQuantizer();
      const values = [10.123, 20.456, 30.789];

      const analysis = quantizer.analyzePrecision(values);

      assert.strictEqual(analysis.hasDecimals, true);
      assert.ok(analysis.suggestedPrecision > 0);
      assert.ok(analysis.lossEstimate >= 0);
    });

    it('should handle empty array', () => {
      const quantizer = new NumericQuantizer();

      const analysis = quantizer.analyzePrecision([]);

      assert.strictEqual(analysis.suggestedPrecision, 2); // default
      assert.strictEqual(analysis.hasDecimals, false);
    });

    it('should filter out non-finite values', () => {
      const quantizer = new NumericQuantizer();
      const values = [1.5, NaN, Infinity, 2.5, -Infinity];

      const analysis = quantizer.analyzePrecision(values);

      assert.strictEqual(analysis.minValue, 1.5);
      assert.strictEqual(analysis.maxValue, 2.5);
    });

    it('should estimate token savings', () => {
      const quantizer = new NumericQuantizer();
      const values = [1.123456789, 2.987654321, 3.456789012];

      const analysis = quantizer.analyzePrecision(values);

      // Should suggest fewer decimals than original
      assert.ok(analysis.suggestedPrecision < 9);
      assert.ok(analysis.tokenSavings > 0);
    });
  });

  describe('quantize', () => {
    it('should quantize to 2 decimal places', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.quantize(3.14159, 2);

      assert.strictEqual(result, 3.14);
    });

    it('should quantize to 0 decimal places (integer)', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.quantize(3.7, 0);

      assert.strictEqual(result, 4);
    });

    it('should handle negative numbers', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.quantize(-3.14159, 2);

      assert.strictEqual(result, -3.14);
    });

    it('should preserve NaN', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.quantize(NaN, 2);

      assert.ok(Number.isNaN(result));
    });

    it('should preserve Infinity', () => {
      const quantizer = new NumericQuantizer();

      assert.strictEqual(quantizer.quantize(Infinity, 2), Infinity);
      assert.strictEqual(quantizer.quantize(-Infinity, 2), -Infinity);
    });

    it('should round correctly', () => {
      const quantizer = new NumericQuantizer();

      const result1 = quantizer.quantize(2.446, 2); // Round up
      const result2 = quantizer.quantize(2.443, 2); // Round down

      assert.strictEqual(result1, 2.45);
      assert.strictEqual(result2, 2.44);
    });
  });

  describe('smartQuantize', () => {
    it('should preserve more decimals for small values', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.smartQuantize(0.00123);

      // Should keep more than 2 decimals
      assert.ok(result.toString().includes('.'));
      const decimals = result.toString().split('.')[1].length;
      assert.ok(decimals >= 5);
    });

    it('should use standard precision for moderate values', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.smartQuantize(50.456);

      // Should be quantized to 2 decimals (value < 100)
      assert.strictEqual(result, 50.46);
      const str = result.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      assert.ok(decimals <= 2);
    });

    it('should use fewer decimals for large values', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.smartQuantize(12345.6789);

      // Should round to integer or 1 decimal
      const str = result.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      assert.ok(decimals <= 1);
    });

    it('should handle zero', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.smartQuantize(0);

      assert.strictEqual(result, 0);
    });

    it('should handle negative values', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.smartQuantize(-0.00123);

      assert.ok(result < 0);
      assert.ok(Math.abs(result) < 0.01);
    });
  });

  describe('quantizeColumn', () => {
    it('should quantize entire column', () => {
      const quantizer = new NumericQuantizer({ defaultPrecision: 2, autoDetect: false });
      const values = [1.234, 2.345, 3.456];

      const result = quantizer.quantizeColumn(values);

      assert.deepStrictEqual(result, [1.23, 2.35, 3.46]);
    });

    it('should use column-specific precision', () => {
      const quantizer = new NumericQuantizer();
      quantizer.setPrecision('price', 2);
      quantizer.setPrecision('weight', 3);

      const prices = [10.123, 20.456];
      const weights = [1.2345, 2.3456];

      const quantizedPrices = quantizer.quantizeColumn(prices, 'price');
      const quantizedWeights = quantizer.quantizeColumn(weights, 'weight');

      assert.deepStrictEqual(quantizedPrices, [10.12, 20.46]);
      assert.deepStrictEqual(quantizedWeights, [1.235, 2.346]);
    });

    it('should auto-detect precision when enabled', () => {
      const quantizer = new NumericQuantizer({ autoDetect: true });
      const values = [1.1, 2.2, 3.3]; // Simple decimals

      const result = quantizer.quantizeColumn(values);

      // Should detect that 1 decimal is sufficient
      result.forEach(v => {
        const str = v.toString();
        const decimals = str.includes('.') ? str.split('.')[1].length : 0;
        assert.ok(decimals <= 1);
      });
    });

    it('should return original values when disabled', () => {
      const quantizer = new NumericQuantizer({ enabled: false });
      const values = [1.234567, 2.345678];

      const result = quantizer.quantizeColumn(values);

      assert.deepStrictEqual(result, values);
    });
  });

  describe('generatePrecisionDirective', () => {
    it('should generate valid directive', () => {
      const quantizer = new NumericQuantizer();

      const directive = quantizer.generatePrecisionDirective('price', 2);

      assert.strictEqual(directive, '@precision price=2');
    });

    it('should handle zero precision', () => {
      const quantizer = new NumericQuantizer();

      const directive = quantizer.generatePrecisionDirective('count', 0);

      assert.strictEqual(directive, '@precision count=0');
    });

    it('should handle high precision', () => {
      const quantizer = new NumericQuantizer();

      const directive = quantizer.generatePrecisionDirective('coordinate', 8);

      assert.strictEqual(directive, '@precision coordinate=8');
    });
  });

  describe('parsePrecisionDirective', () => {
    it('should parse valid directive', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.parsePrecisionDirective('@precision price=2');

      assert.strictEqual(result.column, 'price');
      assert.strictEqual(result.precision, 2);
    });

    it('should handle whitespace', () => {
      const quantizer = new NumericQuantizer();

      const result = quantizer.parsePrecisionDirective('@precision  price = 2 ');

      assert.strictEqual(result.column, 'price');
      assert.strictEqual(result.precision, 2);
    });

    it('should throw on invalid format', () => {
      const quantizer = new NumericQuantizer();

      assert.throws(() => {
        quantizer.parsePrecisionDirective('@precision invalid');
      });
    });

    it('should throw on invalid precision', () => {
      const quantizer = new NumericQuantizer();

      assert.throws(() => {
        quantizer.parsePrecisionDirective('@precision price=abc');
      });

      assert.throws(() => {
        quantizer.parsePrecisionDirective('@precision price=-1');
      });

      assert.throws(() => {
        quantizer.parsePrecisionDirective('@precision price=20'); // Too high
      });
    });
  });

  describe('getPrecision / setPrecision', () => {
    it('should get and set precision', () => {
      const quantizer = new NumericQuantizer({ defaultPrecision: 2 });

      quantizer.setPrecision('price', 3);

      assert.strictEqual(quantizer.getPrecision('price'), 3);
    });

    it('should return default for unknown column', () => {
      const quantizer = new NumericQuantizer({ defaultPrecision: 2 });

      assert.strictEqual(quantizer.getPrecision('unknown'), 2);
    });

    it('should override default', () => {
      const quantizer = new NumericQuantizer({ defaultPrecision: 2 });

      quantizer.setPrecision('price', 4);
      const values = [1.123456];

      const result = quantizer.quantizeColumn(values, 'price');

      assert.strictEqual(result[0], 1.1235);
    });
  });

  describe('shouldQuantize', () => {
    it('should recommend quantization for high-precision floats', () => {
      const quantizer = new NumericQuantizer();
      const values = [1.123456789, 2.987654321, 3.456789012];

      const should = quantizer.shouldQuantize(values, 0.05); // 5% threshold

      assert.strictEqual(should, true);
    });

    it('should not recommend for integers when preserveIntegers is true', () => {
      const quantizer = new NumericQuantizer({ preserveIntegers: true });
      const values = [10, 20, 30, 40];

      const should = quantizer.shouldQuantize(values);

      assert.strictEqual(should, false);
    });

    it('should not recommend when disabled', () => {
      const quantizer = new NumericQuantizer({ enabled: false });
      const values = [1.123456789, 2.987654321];

      const should = quantizer.shouldQuantize(values);

      assert.strictEqual(should, false);
    });

    it('should respect savings threshold', () => {
      const quantizer = new NumericQuantizer();
      const values = [1.12, 2.34]; // Already low precision

      // With very high threshold, should not recommend
      const should = quantizer.shouldQuantize(values, 0.50); // 50% threshold

      assert.strictEqual(should, false);
    });
  });

  describe('Integration', () => {
    it('should complete full quantization workflow', () => {
      const quantizer = new NumericQuantizer({ autoDetect: true });
      const values = [10.123456789, 20.234567891, 30.345678912];

      // Step 1: Analyze
      const analysis = quantizer.analyzePrecision(values);
      assert.ok(analysis.suggestedPrecision > 0);

      // Step 2: Quantize with explicit precision
      quantizer.setPrecision('temperature', analysis.suggestedPrecision);
      const quantized = quantizer.quantizeColumn(values, 'temperature');

      // Verify quantized values are different (shorter)
      const originalStr = values.join(',');
      const quantizedStr = quantized.join(',');
      assert.ok(quantizedStr.length < originalStr.length);

      // Step 3: Generate directive
      const directive = quantizer.generatePrecisionDirective('temperature', analysis.suggestedPrecision);
      assert.ok(directive.startsWith('@precision'));

      // Step 4: Parse directive
      const parsed = quantizer.parsePrecisionDirective(directive);
      assert.strictEqual(parsed.column, 'temperature');
      assert.strictEqual(parsed.precision, analysis.suggestedPrecision);
    });

    it('should handle real-world dataset', () => {
      const quantizer = new NumericQuantizer({ autoDetect: true });

      // Simulate sensor data with high precision
      const sensorData = Array(100).fill(null).map(() => ({
        temperature: 23.123456789 + Math.random(),
        pressure: 101.987654321 + Math.random(),
        humidity: 65.456789012 + Math.random()
      }));

      const temperatures = sensorData.map(d => d.temperature);
      const pressures = sensorData.map(d => d.pressure);

      // Should recommend quantization
      assert.strictEqual(quantizer.shouldQuantize(temperatures, 0.05), true);

      // Quantize columns
      const quantizedTemps = quantizer.quantizeColumn(temperatures);
      const quantizedPressures = quantizer.quantizeColumn(pressures);

      // Verify all values are quantized
      assert.ok(quantizedTemps.length === 100);
      assert.ok(quantizedPressures.length === 100);

      // Original values should be longer strings than quantized
      const originalAvgLength = temperatures.reduce((sum, v) => sum + v.toString().length, 0) / temperatures.length;
      const quantizedAvgLength = quantizedTemps.reduce((sum, v) => sum + v.toString().length, 0) / quantizedTemps.length;

      assert.ok(quantizedAvgLength < originalAvgLength);
    });

    it('should preserve GPS coordinates precision', () => {
      const quantizer = new NumericQuantizer();
      quantizer.setPrecision('lat', 6);
      quantizer.setPrecision('lon', 6);

      const coordinates = [
        { lat: 40.7127753, lon: -74.0059728 }, // New York
        { lat: 51.5073509, lon: -0.1277583 },  // London
        { lat: 35.6761919, lon: 139.6503106 }  // Tokyo
      ];

      const lats = coordinates.map(c => c.lat);
      const lons = coordinates.map(c => c.lon);

      const quantizedLats = quantizer.quantizeColumn(lats, 'lat');
      const quantizedLons = quantizer.quantizeColumn(lons, 'lon');

      // Should preserve 6 decimal places (GPS standard)
      quantizedLats.forEach((lat, i) => {
        assert.ok(Math.abs(lat - lats[i]) < 0.000001);
      });

      quantizedLons.forEach((lon, i) => {
        assert.ok(Math.abs(lon - lons[i]) < 0.000001);
      });
    });
  });
});
