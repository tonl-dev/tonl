/**
 * Integration tests for complete Query API (T007)
 * Real-world scenarios and end-to-end testing
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { TONLDocument } from '../../dist/src/index.js';

describe('Query API Integration - T007', () => {
  // E-commerce scenario
  const ecommerceData = {
    store: {
      name: 'TechStore',
      categories: [
        {
          id: 1,
          name: 'Electronics',
          products: [
            { id: 101, name: 'Laptop', price: 999.99, stock: 5, tags: ['computers', 'portable'] },
            { id: 102, name: 'Phone', price: 599.99, stock: 15, tags: ['mobile', 'portable'] }
          ]
        },
        {
          id: 2,
          name: 'Accessories',
          products: [
            { id: 201, name: 'Mouse', price: 29.99, stock: 50, tags: ['computers', 'peripherals'] },
            { id: 202, name: 'Keyboard', price: 79.99, stock: 30, tags: ['computers', 'peripherals'] }
          ]
        }
      ]
    }
  };

  test('should query products across all categories', () => {
    const doc = TONLDocument.fromJSON(ecommerceData);
    const allProducts = doc.query('store.categories[*].products[*]');
    assert.strictEqual(allProducts.length, 4);
  });

  test('should find expensive products with filter', () => {
    const doc = TONLDocument.fromJSON(ecommerceData);
    const expensive = doc.query('store.categories[*].products[*]');
    const filtered = expensive.filter((p: any) => p.price > 500);
    assert.strictEqual(filtered.length, 2);
  });

  test('should get all product names recursively', () => {
    const doc = TONLDocument.fromJSON(ecommerceData);
    const names = doc.query('$..products[*].name');
    assert.ok(names.includes('Laptop'));
    assert.ok(names.includes('Mouse'));
  });

  test('should navigate and query combined', () => {
    const doc = TONLDocument.fromJSON(ecommerceData);

    // First navigate to categories
    const categories = doc.get('store.categories');

    // Then query within
    const doc2 = TONLDocument.fromJSON({ categories });
    const electronicsProducts = doc2.query('categories[0].products[*].name');
    assert.deepStrictEqual(electronicsProducts, ['Laptop', 'Phone']);
  });

  test('should handle round-trip with queries', () => {
    const doc = TONLDocument.fromJSON(ecommerceData);
    const tonl = doc.toTONL();
    const doc2 = TONLDocument.parse(tonl);

    const products1 = doc.query('store.categories[*].products[*].name');
    const products2 = doc2.query('store.categories[*].products[*].name');

    assert.deepStrictEqual(products1, products2);
  });
});

describe('Navigation Integration - T007', () => {
  const socialData = {
    users: [
      {
        id: 1,
        username: 'alice',
        posts: [
          { id: 101, text: 'Hello world', likes: 10 },
          { id: 102, text: 'TONL rocks!', likes: 25 }
        ]
      },
      {
        id: 2,
        username: 'bob',
        posts: [
          { id: 201, text: 'Good morning', likes: 5 }
        ]
      }
    ]
  };

  test('should iterate and query together', () => {
    const doc = TONLDocument.fromJSON(socialData);

    const usernames: string[] = [];
    for (const user of doc.query('users[*]')) {
      usernames.push(user.username);
    }

    assert.deepStrictEqual(usernames, ['alice', 'bob']);
  });

  test('should walk and collect specific values', () => {
    const doc = TONLDocument.fromJSON(socialData);

    const postTexts: string[] = [];
    doc.walk((path, value) => {
      if (path.includes('text') && typeof value === 'string') {
        postTexts.push(value);
      }
    });

    assert.strictEqual(postTexts.length, 3);
  });

  test('should combine query with tree walking', () => {
    const doc = TONLDocument.fromJSON(socialData);

    // Query for users
    const users = doc.query('users[*]');

    // Walk each user
    let totalPosts = 0;
    for (const user of users) {
      const userDoc = TONLDocument.fromJSON(user);
      totalPosts += userDoc.countNodes();
    }

    assert.ok(totalPosts > 0);
  });
});
