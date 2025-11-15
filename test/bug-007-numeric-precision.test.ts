/**
 * BUG-007: Numeric Precision Loss Tests
 * Tests for the fix that prevents silent data corruption from large integer parsing
 */

import { test } from 'node:test';
import { parsePrimitiveValue } from '../dist/parser/line-parser.js';

test('BUG-007: Numeric Precision Loss Prevention', async (t) => {
  const context = {
    currentLine: 1,
    filename: 'test',
    delimiter: ',',
    strict: false,
    version: '1.0'
  };

  await t.test('should preserve precision for integers within safe range', () => {
    const safeInt = '1234567890';
    const result = parsePrimitiveValue(safeInt, context);

    if (typeof result === 'number') {
      console.log(`✅ Safe integer parsed correctly: ${result}`);
    } else {
      throw new Error(`Expected number, got ${typeof result}: ${result}`);
    }
  });

  await t.test('should preserve precision for integers at safe limit', () => {
    const maxSafe = String(Number.MAX_SAFE_INTEGER);
    const result = parsePrimitiveValue(maxSafe, context);

    if (typeof result === 'number') {
      console.log(`✅ MAX_SAFE_INTEGER parsed correctly: ${result}`);
    } else {
      throw new Error(`Expected number, got ${typeof result}: ${result}`);
    }
  });

  await t.test('should preserve precision for integers that would cause precision loss', () => {
    // This integer exceeds Number.MAX_SAFE_INTEGER and would lose precision
    const tooLarge = '9007199254740993'; // Number.MAX_SAFE_INTEGER + 2
    const result = parsePrimitiveValue(tooLarge, context);

    if (typeof result === 'string') {
      console.log(`✅ Large integer preserved as string: ${result}`);

      // Verify the string matches exactly
      if (result !== tooLarge) {
        throw new Error(`String value altered: expected ${tooLarge}, got ${result}`);
      }
    } else {
      throw new Error(`Expected string for precision protection, got ${typeof result}: ${result}`);
    }
  });

  await t.test('should preserve precision for negative large integers', () => {
    const tooLargeNegative = '-9007199254740993';
    const result = parsePrimitiveValue(tooLargeNegative, context);

    if (typeof result === 'string') {
      console.log(`✅ Large negative integer preserved as string: ${result}`);

      if (result !== tooLargeNegative) {
        throw new Error(`String value altered: expected ${tooLargeNegative}, got ${result}`);
      }
    } else {
      throw new Error(`Expected string for precision protection, got ${typeof result}: ${result}`);
    }
  });

  await t.test('should preserve precision for integers beyond safe range', () => {
    // BUG-007 FIX: Integers beyond MAX_SAFE_INTEGER should be preserved as strings
    const beyondSafeRange = '9007199254740992'; // Number.MAX_SAFE_INTEGER + 1
    const result = parsePrimitiveValue(beyondSafeRange, context);

    if (typeof result === 'string') {
      console.log(`✅ Large integer correctly preserved as string: ${result}`);
      // Verify no precision loss
      if (result !== beyondSafeRange) {
        throw new Error(`Value corruption detected: expected ${beyondSafeRange}, got ${result}`);
      }
    } else {
      throw new Error(`Expected string for large integer beyond safe range, got ${typeof result}: ${result}`);
    }
  });

  await t.test('should demonstrate precision loss before fix', () => {
    // This demonstrates what would happen without the fix
    const problematicInt = '9007199254740993';
    const directParse = parseInt(problematicInt, 10);

    console.log(`📊 Direct parseInt result: ${directParse}`);
    console.log(`📊 Original string: ${problematicInt}`);
    console.log(`📊 BigInt value: ${BigInt(problematicInt)}`);
    console.log(`📊 Precision lost: ${directParse.toString() !== problematicInt}`);

    // Verify that direct parseInt would cause precision loss
    if (BigInt(directParse) === BigInt(problematicInt)) {
      throw new Error('Expected precision loss in this test case');
    }

    // Verify our fix prevents this
    const safeResult = parsePrimitiveValue(problematicInt, context);
    if (typeof safeResult !== 'string') {
      throw new Error('Fix should have preserved precision as string');
    }
  });

  await t.test('should handle very large integers gracefully', () => {
    const extremelyLarge = '123456789012345678901234567890';
    const result = parsePrimitiveValue(extremelyLarge, context);

    if (typeof result === 'string') {
      console.log(`✅ Extremely large integer preserved as string`);
      console.log(`   Length: ${result.length} characters`);

      if (result !== extremelyLarge) {
        throw new Error(`String value altered`);
      }
    } else {
      throw new Error(`Expected string for extremely large integer, got ${typeof result}`);
    }
  });

  await t.test('should still work normally for decimal numbers', () => {
    const decimalNum = '123.456';
    const result = parsePrimitiveValue(decimalNum, context);

    if (typeof result === 'number') {
      console.log(`✅ Decimal number parsed correctly: ${result}`);
    } else {
      throw new Error(`Expected number for decimal, got ${typeof result}: ${result}`);
    }
  });

  await t.test('should still work normally for scientific notation', () => {
    const scientific = '1.23e10';
    const result = parsePrimitiveValue(scientific, context);

    if (typeof result === 'number') {
      console.log(`✅ Scientific notation parsed correctly: ${result}`);
    } else {
      throw new Error(`Expected number for scientific notation, got ${typeof result}: ${result}`);
    }
  });
});

