/**
 * Tests for Tokenizer-Aware Encoding
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TokenizerAware } from '../../dist/optimization/tokenizer-aware.js';

describe('TokenizerAware - Basic Functionality', () => {
  it('should create instance with default options', () => {
    const tokenizer = new TokenizerAware();
    const text = "Hello world";
    const tokens = tokenizer.estimateTokens(text);
    assert.ok(tokens > 0);
  });

  it('should create instance with custom options', () => {
    const tokenizer = new TokenizerAware({
      enabled: true,
      targetTokenizer: 'claude',
      preferSpaces: false,
      minimalQuoting: false,
      compactNumbers: false,
      optimizeCase: true
    });
    assert.ok(tokenizer);
  });

  it('should estimate token count for text', () => {
    const tokenizer = new TokenizerAware();
    const text = "This is a test string";
    const tokens = tokenizer.estimateTokens(text);

    // Approximate: ~4 chars per token
    const expectedTokens = Math.ceil(text.length / 4);
    assert.strictEqual(tokens, expectedTokens);
  });

  it('should estimate tokens for empty string', () => {
    const tokenizer = new TokenizerAware();
    const tokens = tokenizer.estimateTokens("");
    assert.strictEqual(tokens, 0);
  });

  it('should estimate tokens for long text', () => {
    const tokenizer = new TokenizerAware();
    const text = "a".repeat(1000);
    const tokens = tokenizer.estimateTokens(text);
    assert.strictEqual(tokens, 250); // 1000 / 4
  });
});

describe('TokenizerAware - Delimiter Recommendation', () => {
  it('should recommend comma when no conflicts', () => {
    const tokenizer = new TokenizerAware();
    const sample = "id:1 name:Alice";
    const delimiter = tokenizer.recommendDelimiter(sample);
    assert.strictEqual(delimiter, ',');
  });

  it('should recommend pipe when comma exists', () => {
    const tokenizer = new TokenizerAware();
    const sample = "name:Smith, John";
    const delimiter = tokenizer.recommendDelimiter(sample);
    assert.strictEqual(delimiter, '|');
  });

  it('should recommend tab when comma and pipe exist', () => {
    const tokenizer = new TokenizerAware();
    const sample = "address:123 Main St, Apt #5|City";
    const delimiter = tokenizer.recommendDelimiter(sample);
    assert.strictEqual(delimiter, '\t');
  });

  it('should recommend semicolon when all common delimiters exist', () => {
    const tokenizer = new TokenizerAware();
    const sample = "data:a,b|c\td";
    const delimiter = tokenizer.recommendDelimiter(sample);
    assert.strictEqual(delimiter, ';');
  });

  it('should handle empty sample', () => {
    const tokenizer = new TokenizerAware();
    const delimiter = tokenizer.recommendDelimiter("");
    assert.strictEqual(delimiter, ',');
  });
});

describe('TokenizerAware - Text Optimization', () => {
  it('should replace tabs with spaces when preferSpaces is true', () => {
    const tokenizer = new TokenizerAware({ preferSpaces: true });
    const text = "id\t1\tname\tAlice";
    const optimized = tokenizer.optimize(text);
    assert.strictEqual(optimized, "id 1 name Alice");
  });

  it('should keep tabs when preferSpaces is false', () => {
    const tokenizer = new TokenizerAware({ preferSpaces: false });
    const text = "id\t1\tname\tAlice";
    const optimized = tokenizer.optimize(text);
    assert.strictEqual(optimized, text);
  });

  it('should remove unnecessary quotes when minimalQuoting is true', () => {
    const tokenizer = new TokenizerAware({ minimalQuoting: true });
    const text = '"name","email","active"';
    const optimized = tokenizer.optimize(text);
    assert.strictEqual(optimized, 'name,email,active');
  });

  it('should keep quotes when minimalQuoting is false', () => {
    const tokenizer = new TokenizerAware({ minimalQuoting: false });
    const text = '"name","email","active"';
    const optimized = tokenizer.optimize(text);
    assert.strictEqual(optimized, text);
  });

  it('should not remove quotes from values with spaces', () => {
    const tokenizer = new TokenizerAware({ minimalQuoting: true });
    const text = '"John Smith","test@example.com"';
    const optimized = tokenizer.optimize(text);
    // Quotes around "John Smith" should remain (has space)
    assert.ok(optimized.includes('"John Smith"'));
  });

  it('should compact numbers when compactNumbers is true', () => {
    const tokenizer = new TokenizerAware({ compactNumbers: true });
    const text = "value1:10.0,value2:20.00,value3:30.000";
    const optimized = tokenizer.optimize(text);
    assert.strictEqual(optimized, 'value1:10,value2:20,value3:30');
  });

  it('should keep decimal numbers intact', () => {
    const tokenizer = new TokenizerAware({ compactNumbers: true });
    const text = "value:3.14,ratio:0.5";
    const optimized = tokenizer.optimize(text);
    assert.strictEqual(optimized, text);
  });

  it('should apply all optimizations together', () => {
    const tokenizer = new TokenizerAware({
      preferSpaces: true,
      minimalQuoting: true,
      compactNumbers: true
    });
    const text = '"id"\t"name"\t"score"\n1\t"Alice"\t100.0\n2\t"Bob"\t95.00';
    const optimized = tokenizer.optimize(text);

    assert.ok(!optimized.includes('\t'));
    assert.ok(!optimized.includes('"id"'));
    assert.ok(optimized.includes('100') && !optimized.includes('100.0'));
  });
});

describe('TokenizerAware - Text Analysis', () => {
  it('should analyze text and return recommendations', () => {
    const tokenizer = new TokenizerAware();
    const text = "id\t1\tname\tAlice";
    const analysis = tokenizer.analyzeText(text);

    assert.ok(analysis.estimatedTokens > 0);
    assert.strictEqual(analysis.recommendedDelimiter, ',');
    assert.strictEqual(analysis.recommendedQuoting, 'minimal');
    assert.ok(Array.isArray(analysis.optimizations));
  });

  it('should detect tab usage in analysis', () => {
    const tokenizer = new TokenizerAware();
    const text = "id\t1\tname\tAlice";
    const analysis = tokenizer.analyzeText(text);

    assert.ok(analysis.optimizations.includes('Replace tabs with spaces'));
  });

  it('should detect pipe delimiter usage', () => {
    const tokenizer = new TokenizerAware();
    const text = "id|1|name|Alice";
    const analysis = tokenizer.analyzeText(text);

    assert.ok(analysis.optimizations.includes('Use comma instead of pipe delimiter'));
  });

  it('should detect unnecessary quotes', () => {
    const tokenizer = new TokenizerAware();
    const text = '"id","name","email"';
    const analysis = tokenizer.analyzeText(text);

    assert.ok(analysis.optimizations.includes('Remove unnecessary quotes'));
  });

  it('should return empty optimizations for already optimal text', () => {
    const tokenizer = new TokenizerAware();
    const text = "id,name,email";
    const analysis = tokenizer.analyzeText(text);

    assert.strictEqual(analysis.optimizations.length, 0);
  });

  it('should recommend conservative quoting when minimalQuoting is false', () => {
    const tokenizer = new TokenizerAware({ minimalQuoting: false });
    const text = "id,name,email";
    const analysis = tokenizer.analyzeText(text);

    assert.strictEqual(analysis.recommendedQuoting, 'conservative');
  });
});

describe('TokenizerAware - Directive Generation', () => {
  it('should generate tokenizer directive', () => {
    const tokenizer = new TokenizerAware();
    const directive = tokenizer.generateDirective('gpt');
    assert.strictEqual(directive, '@tokenizer gpt');
  });

  it('should generate directive for Claude', () => {
    const tokenizer = new TokenizerAware();
    const directive = tokenizer.generateDirective('claude');
    assert.strictEqual(directive, '@tokenizer claude');
  });

  it('should generate directive for Gemini', () => {
    const tokenizer = new TokenizerAware();
    const directive = tokenizer.generateDirective('gemini');
    assert.strictEqual(directive, '@tokenizer gemini');
  });

  it('should generate directive for generic tokenizer', () => {
    const tokenizer = new TokenizerAware();
    const directive = tokenizer.generateDirective('generic');
    assert.strictEqual(directive, '@tokenizer generic');
  });
});

describe('TokenizerAware - Directive Parsing', () => {
  it('should parse valid tokenizer directive', () => {
    const tokenizer = new TokenizerAware();
    const target = tokenizer.parseDirective('@tokenizer gpt');
    assert.strictEqual(target, 'gpt');
  });

  it('should parse Claude directive', () => {
    const tokenizer = new TokenizerAware();
    const target = tokenizer.parseDirective('@tokenizer claude');
    assert.strictEqual(target, 'claude');
  });

  it('should parse Gemini directive', () => {
    const tokenizer = new TokenizerAware();
    const target = tokenizer.parseDirective('@tokenizer gemini');
    assert.strictEqual(target, 'gemini');
  });

  it('should throw error on invalid directive format', () => {
    const tokenizer = new TokenizerAware();
    assert.throws(() => {
      tokenizer.parseDirective('invalid directive');
    }, /Invalid tokenizer directive/);
  });

  it('should throw error on missing target', () => {
    const tokenizer = new TokenizerAware();
    assert.throws(() => {
      tokenizer.parseDirective('@tokenizer');
    }, /Invalid tokenizer directive/);
  });

  it('should throw error on wrong directive name', () => {
    const tokenizer = new TokenizerAware();
    assert.throws(() => {
      tokenizer.parseDirective('@optimizer gpt');
    }, /Invalid tokenizer directive/);
  });
});

describe('TokenizerAware - Savings Estimation', () => {
  it('should estimate savings from optimization', () => {
    const tokenizer = new TokenizerAware({
      preferSpaces: true,
      minimalQuoting: true,
      compactNumbers: true
    });
    const original = '"id"\t"name"\t"score"\n1\t"Alice"\t100.0';
    const savings = tokenizer.estimateSavings(original);

    assert.ok(savings > 0);
  });

  it('should return 0 savings for already optimal text', () => {
    const tokenizer = new TokenizerAware();
    const original = "id,name,email";
    const savings = tokenizer.estimateSavings(original);

    assert.strictEqual(savings, 0);
  });

  it('should calculate savings from tab replacement', () => {
    const tokenizer = new TokenizerAware({ preferSpaces: true });
    const original = "a\tb\tc\td";
    const savings = tokenizer.estimateSavings(original);

    // No actual byte savings, but token savings possible
    assert.ok(savings >= 0);
  });

  it('should calculate savings from quote removal', () => {
    const tokenizer = new TokenizerAware({ minimalQuoting: true });
    const original = '"name","email","active"';
    const savings = tokenizer.estimateSavings(original);

    // Removed 6 quotes = 6 characters = ~1-2 tokens
    assert.ok(savings >= 1);
  });

  it('should calculate savings from number compaction', () => {
    const tokenizer = new TokenizerAware({ compactNumbers: true });
    const original = "10.0,20.00,30.000,40.0000";
    const savings = tokenizer.estimateSavings(original);

    // Removed 8 characters (.0, .00, .000, .0000)
    assert.ok(savings >= 2);
  });
});

describe('TokenizerAware - Optimization Decisions', () => {
  it('should recommend optimization when savings > 0', () => {
    const tokenizer = new TokenizerAware({
      preferSpaces: true,
      minimalQuoting: true
    });
    const text = '"id"\t"name"\t"email"';
    assert.ok(tokenizer.shouldOptimize(text));
  });

  it('should not recommend optimization when no savings', () => {
    const tokenizer = new TokenizerAware();
    const text = "id,name,email";
    assert.ok(!tokenizer.shouldOptimize(text));
  });

  it('should not recommend when disabled', () => {
    const tokenizer = new TokenizerAware({ enabled: false });
    const text = '"id"\t"name"\t"email"';
    assert.ok(!tokenizer.shouldOptimize(text));
  });

  it('should recommend when enabled and has savings', () => {
    const tokenizer = new TokenizerAware({
      enabled: true,
      minimalQuoting: true
    });
    const text = '"id","name","email"';
    assert.ok(tokenizer.shouldOptimize(text));
  });
});

describe('TokenizerAware - Real-world Scenarios', () => {
  it('should optimize CSV-like data', () => {
    const tokenizer = new TokenizerAware();
    const csv = `"id","name","email","score"
"1","Alice","alice@example.com","95.00"
"2","Bob","bob@example.com","87.50"`;

    const optimized = tokenizer.optimize(csv);

    // Should remove quotes from simple values
    assert.ok(optimized.includes('id,'));
    assert.ok(!optimized.includes('"id"'));
  });

  it('should optimize TSV data to spaces', () => {
    const tokenizer = new TokenizerAware({ preferSpaces: true });
    const tsv = "id\tname\temail\n1\tAlice\talice@test.com";

    const optimized = tokenizer.optimize(tsv);

    assert.ok(!optimized.includes('\t'));
    assert.ok(optimized.includes(' '));
  });

  it('should optimize scientific notation', () => {
    const tokenizer = new TokenizerAware({ compactNumbers: true });
    const data = "measurement1:1000.0,measurement2:2000.00,measurement3:3000.000";

    const optimized = tokenizer.optimize(data);

    assert.strictEqual(optimized, 'measurement1:1000,measurement2:2000,measurement3:3000');
  });

  it('should handle mixed content', () => {
    const tokenizer = new TokenizerAware({
      preferSpaces: true,
      minimalQuoting: true,
      compactNumbers: true
    });

    const mixed = `"product"\t"price"\t"quantity"
"Widget A"\t10.00\t100.0
"Widget B"\t25.50\t50.00`;

    const optimized = tokenizer.optimize(mixed);

    // Check various optimizations applied
    assert.ok(!optimized.includes('\t'));
    assert.ok(optimized.includes(' '));
    assert.ok(optimized.includes('100') && !optimized.includes('100.0'));
    assert.ok(optimized.includes('50') && !optimized.includes('50.00'));
  });

  it('should preserve quoted values with special characters', () => {
    const tokenizer = new TokenizerAware({ minimalQuoting: true });
    const text = '"John Smith","test@example.com","New York, NY"';

    const optimized = tokenizer.optimize(text);

    // Should keep quotes around values with spaces/commas
    assert.ok(optimized.includes('"John Smith"'));
    assert.ok(optimized.includes('"New York, NY"'));
  });

  it('should analyze e-commerce data', () => {
    const tokenizer = new TokenizerAware();
    const data = `product_id|product_name|price|stock
123|"Laptop Pro"|1299.00|50
124|"Mouse Wireless"|29.99|200`;

    const analysis = tokenizer.analyzeText(data);

    assert.ok(analysis.optimizations.includes('Use comma instead of pipe delimiter'));
    assert.ok(analysis.estimatedTokens > 0);
  });

  it('should optimize log-like data', () => {
    const tokenizer = new TokenizerAware({
      preferSpaces: true,
      compactNumbers: true
    });

    const logs = `timestamp\tlevel\tmessage
1234567890.0\t"INFO"\t"Server started"
1234567891.0\t"WARN"\t"High memory usage"`;

    const optimized = tokenizer.optimize(logs);

    assert.ok(!optimized.includes('\t'));
    assert.ok(optimized.includes('1234567890') && !optimized.includes('1234567890.0'));
  });
});

describe('TokenizerAware - Edge Cases', () => {
  it('should handle empty string', () => {
    const tokenizer = new TokenizerAware();
    const optimized = tokenizer.optimize("");
    assert.strictEqual(optimized, "");
  });

  it('should handle string with only tabs', () => {
    const tokenizer = new TokenizerAware({ preferSpaces: true });
    const optimized = tokenizer.optimize("\t\t\t");
    assert.strictEqual(optimized, "   ");
  });

  it('should handle string with only quotes', () => {
    const tokenizer = new TokenizerAware({ minimalQuoting: true });
    const optimized = tokenizer.optimize('""');
    assert.strictEqual(optimized, '""');
  });

  it('should handle numbers without trailing zeros', () => {
    const tokenizer = new TokenizerAware({ compactNumbers: true });
    const optimized = tokenizer.optimize("1,2,3,4,5");
    assert.strictEqual(optimized, "1,2,3,4,5");
  });

  it('should handle very long text', () => {
    const tokenizer = new TokenizerAware();
    const longText = "a".repeat(100000);
    const tokens = tokenizer.estimateTokens(longText);
    assert.strictEqual(tokens, 25000);
  });

  it('should handle unicode characters', () => {
    const tokenizer = new TokenizerAware();
    const unicode = "héllo,wörld,日本語";
    const optimized = tokenizer.optimize(unicode);
    assert.strictEqual(optimized, unicode);
  });

  it('should handle newlines', () => {
    const tokenizer = new TokenizerAware({ preferSpaces: true });
    const text = "line1\nline2\nline3";
    const optimized = tokenizer.optimize(text);
    assert.strictEqual(optimized, text); // Newlines should be preserved
  });
});

describe('TokenizerAware - Different Tokenizer Targets', () => {
  it('should work with GPT tokenizer target', () => {
    const tokenizer = new TokenizerAware({ targetTokenizer: 'gpt' });
    const directive = tokenizer.generateDirective('gpt');
    assert.strictEqual(directive, '@tokenizer gpt');
  });

  it('should work with Claude tokenizer target', () => {
    const tokenizer = new TokenizerAware({ targetTokenizer: 'claude' });
    const directive = tokenizer.generateDirective('claude');
    assert.strictEqual(directive, '@tokenizer claude');
  });

  it('should work with Gemini tokenizer target', () => {
    const tokenizer = new TokenizerAware({ targetTokenizer: 'gemini' });
    const directive = tokenizer.generateDirective('gemini');
    assert.strictEqual(directive, '@tokenizer gemini');
  });

  it('should work with generic tokenizer target', () => {
    const tokenizer = new TokenizerAware({ targetTokenizer: 'generic' });
    const directive = tokenizer.generateDirective('generic');
    assert.strictEqual(directive, '@tokenizer generic');
  });
});
