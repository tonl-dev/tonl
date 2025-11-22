/**
 * Enhanced Security Utilities Tests
 * Tests for backward compatible security improvements
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  SecurityValidator,
  InputValidator,
  SecurityUtils,
  DEFAULT_SECURITY_LIMITS,
  type SecurityLimits
} from '../../dist/utils/security.js';
import { SecurityError } from '../../dist/errors/index.js';

describe('Enhanced Security Utilities', () => {
  describe('SecurityValidator', () => {
    test('should accept safe regex patterns', (t) => {
      const safePatterns = [
        '^[a-zA-Z]+$',
        '\\d{3}-\\d{2}-\\d{4}',
        '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}',
        '^https?://[^\\s/$.?#].[^\\s]*$'
      ];

      for (const pattern of safePatterns) {
        t.assert.doesNotThrow(() => {
          SecurityValidator.validateRegexPattern(pattern);
        }, `Safe pattern should pass: ${pattern}`);
      }
    });

    test('should reject patterns with nested quantifiers', (t) => {
      const dangerousPatterns = [
        '(a+)+',
        '(a*)*',
        '(.+)+',
        '(\\w+)*',
        '(\\d+)+\\1+'
      ];

      for (const pattern of dangerousPatterns) {
        t.assert.throws(() => {
          SecurityValidator.validateRegexPattern(pattern);
        }, SecurityError, `Dangerous pattern should fail: ${pattern}`);
      }
    });

    test('should reject overly long patterns', (t) => {
      const longPattern = 'a'.repeat(200);

      t.assert.throws(() => {
        SecurityValidator.validateRegexPattern(longPattern);
      }, SecurityError, 'Pattern too long should throw SecurityError');
    });

    test('should reject patterns with excessive nesting', (t) => {
      const nestedPattern = '(((((a))))';

      t.assert.throws(() => {
        SecurityValidator.validateRegexPattern(nestedPattern);
      }, SecurityError, 'Nested pattern should throw SecurityError');
    });

    test('should work with custom limits', (t) => {
      const customLimits: SecurityLimits = {
        ...DEFAULT_SECURITY_LIMITS,
        MAX_REGEX_PATTERN_LENGTH: 10
      };

      t.assert.throws(() => {
        SecurityValidator.validateRegexPattern('abcdefghijk', customLimits);
      }, SecurityError, 'Custom limits should be respected');
    });
  });

  describe('InputValidator', () => {
    test('should accept normal-sized input', (t) => {
      const normalInput = JSON.stringify({
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
      });

      t.assert.doesNotThrow(() => {
        InputValidator.validateInput(normalInput);
      }, 'Normal input should pass validation');
    });

    test('should reject oversized input', (t) => {
      const oversizedInput = 'x'.repeat(11 * 1024 * 1024); // 11MB

      t.assert.throws(() => {
        InputValidator.validateInput(oversizedInput);
      }, SecurityError, 'Oversized input should throw SecurityError');
    });

    test('should reject input with overly long lines', (t) => {
      const inputWithLongLine = 'x'.repeat(101 * 1024); // 101KB line

      t.assert.throws(() => {
        InputValidator.validateInput(inputWithLongLine);
      }, SecurityError, 'Long line should throw SecurityError');
    });

    test('should reject input with too many fields', (t) => {
      const inputWithManyFields = 'x,'.repeat(11 * 1024); // 11K fields

      t.assert.throws(() => {
        InputValidator.validateInput(inputWithManyFields);
      }, SecurityError, 'Many fields should throw SecurityError');
    });

    test('should validate nesting depth', (t) => {
      const deepInput = '{'.repeat(101) + '}'.repeat(101);

      t.assert.throws(() => {
        InputValidator.validateNestingDepth(deepInput);
      }, SecurityError, 'Deep nesting should throw SecurityError');
    });
  });

  describe('SecurityUtils', () => {
    test('should parse safe JSON input', (t) => {
      const safeJson = '{"name": "Alice", "age": 30}';

      t.assert.doesNotThrow(() => {
        const result = SecurityUtils.safeJsonParse(safeJson);
        t.assert.strictEqual(result.name, 'Alice');
        t.assert.strictEqual(result.age, 30);
      }, 'Safe JSON should parse correctly');
    });

    test('should reject malicious JSON input', (t) => {
      const maliciousJson = 'x'.repeat(11 * 1024 * 1024);

      t.assert.throws(() => {
        SecurityUtils.safeJsonParse(maliciousJson);
      }, SecurityError, 'Malicious JSON should throw SecurityError');
    });

    test('should handle JSON parse errors safely', (t) => {
      const invalidJson = '{"name": "Alice", "age": }';

      t.assert.throws(() => {
        SecurityUtils.safeJsonParse(invalidJson);
      }, SyntaxError, 'Invalid JSON should throw SyntaxError, not SecurityError');
    });

    test('should validate file paths', (t) => {
      const safePaths = [
        'file.json',
        'data/config.tonl',
        'outputs/result.json'
      ];

      for (const path of safePaths) {
        t.assert.doesNotThrow(() => {
          SecurityUtils.validateFilePath(path);
        }, `Safe path should pass: ${path}`);
      }
    });

    test('should reject dangerous file paths', (t) => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        '/etc/passwd',
        'C:\\Windows\\System32',
        'file\x00name',
        'CON',
        'PRN',
        'AUX'
      ];

      for (const path of dangerousPaths) {
        t.assert.throws(() => {
          SecurityUtils.validateFilePath(path);
        }, SecurityError, `Dangerous path should fail: ${path}`);
      }
    });

    test('should sanitize input', (t) => {
      const unsanitizedInput = 'test\x00input\r\nwith\ncontrol\tchars   ';
      const sanitized = SecurityUtils.sanitizeInput(unsanitizedInput);

      t.assert.strictEqual(sanitized, 'testinput with control chars');
      t.assert(!sanitized.includes('\0'));
      t.assert(!sanitized.includes('\n'));
      t.assert(!sanitized.includes('\r'));
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain existing SecurityError behavior', (t) => {
      // Test that SecurityError still works as expected
      const error = new SecurityError('Test error');

      t.assert.ok(error instanceof Error);
      t.assert.ok(error instanceof SecurityError);
      t.assert.strictEqual(error.message, 'Test error');
    });

    test('should work with existing error handling', (t) => {
      // Test that new security validators integrate with existing error handling
      try {
        SecurityValidator.validateRegexPattern('(a+)+');
        t.assert.fail('Should have thrown SecurityError');
      } catch (error) {
        t.assert.ok(error instanceof SecurityError);
        t.assert.ok(error.message.includes('Dangerous regex pattern'));
      }
    });

    test('should not break existing functionality', (t) => {
      // Test that existing functionality still works
      const jsonData = '{"test": "value"}';
      const parsed = SecurityUtils.safeJsonParse(jsonData);

      t.assert.strictEqual(parsed.test, 'value');
    });
  });

  describe('Performance', () => {
    test('should validate patterns efficiently', (t) => {
      const patterns = Array(100).fill(0).map((_, i) => `^[a-z]{${i}}$`);

      const start = Date.now();

      for (const pattern of patterns) {
        SecurityValidator.validateRegexPattern(pattern);
      }

      const duration = Date.now() - start;

      // Should complete 100 validations in under 100ms
      t.assert.ok(duration < 100, `Validation took ${duration}ms, expected < 100ms`);
    });

    test('should handle large inputs efficiently', (t) => {
      const largeInput = '{"data": "' + 'x'.repeat(10000) + '"}';

      const start = Date.now();
      SecurityUtils.safeJsonParse(largeInput);
      const duration = Date.now() - start;

      // Should handle 10KB input in under 10ms
      t.assert.ok(duration < 10, `Parsing took ${duration}ms, expected < 10ms`);
    });
  });
});