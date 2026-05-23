/**
 * TONL Query API - Aggregation Examples
 *
 * This example demonstrates powerful aggregation capabilities added in v2.4.0:
 * - count(), sum(), avg(), min(), max()
 * - groupBy(), distinct(), frequency()
 * - stats(), median(), percentile()
 * - filter(), map(), reduce(), orderBy()
 * - take(), skip(), first(), last()
 */

import { TONLDocument } from '../../dist/index.js';
import { aggregate } from '../../dist/query/aggregators.js';

console.log('=== TONL Query API - Aggregation (v2.4.0) ===\n');

// E-commerce dataset
const data = {
  products: [
    { id: 1, name: 'Laptop', price: 999.99, category: 'electronics', stock: 50, rating: 4.5 },
    { id: 2, name: 'Phone', price: 599.99, category: 'electronics', stock: 100, rating: 4.7 },
    { id: 3, name: 'Headphones', price: 149.99, category: 'electronics', stock: 200, rating: 4.3 },
    { id: 4, name: 'Tablet', price: 449.99, category: 'electronics', stock: 75, rating: 4.4 },
    { id: 5, name: 'Book', price: 19.99, category: 'books', stock: 500, rating: 4.8 },
    { id: 6, name: 'Notebook', price: 9.99, category: 'books', stock: 1000, rating: 4.2 },
    { id: 7, name: 'Pen Set', price: 14.99, category: 'office', stock: 300, rating: 4.1 },
    { id: 8, name: 'Desk Lamp', price: 39.99, category: 'office', stock: 150, rating: 4.6 },
    { id: 9, name: 'Chair', price: 299.99, category: 'furniture', stock: 40, rating: 4.5 },
    { id: 10, name: 'Desk', price: 499.99, category: 'furniture', stock: 25, rating: 4.4 }
  ],
  orders: [
    { id: 101, customerId: 1, total: 1599.98, status: 'completed', items: 2 },
    { id: 102, customerId: 2, total: 599.99, status: 'pending', items: 1 },
    { id: 103, customerId: 1, total: 29.98, status: 'completed', items: 2 },
    { id: 104, customerId: 3, total: 449.99, status: 'shipped', items: 1 },
    { id: 105, customerId: 2, total: 189.98, status: 'completed', items: 3 },
    { id: 106, customerId: 4, total: 799.98, status: 'pending', items: 2 },
    { id: 107, customerId: 1, total: 39.99, status: 'completed', items: 1 },
    { id: 108, customerId: 5, total: 999.99, status: 'shipped', items: 1 }
  ],
  customers: [
    { id: 1, name: 'Alice Johnson', country: 'US', tier: 'gold' },
    { id: 2, name: 'Bob Smith', country: 'UK', tier: 'silver' },
    { id: 3, name: 'Charlie Brown', country: 'US', tier: 'bronze' },
    { id: 4, name: 'Diana Lee', country: 'CA', tier: 'gold' },
    { id: 5, name: 'Eve Wilson', country: 'US', tier: 'silver' }
  ]
};

const doc = TONLDocument.fromJSON(data);

// ============================================
// 1. BASIC AGGREGATIONS
// ============================================
console.log('1. BASIC AGGREGATIONS');
console.log('─'.repeat(50));

// Count
console.log('\n📊 Count:');
console.log('   Total products:', doc.count('products[*]'));
console.log('   Electronics:', doc.count('products[?(@.category == "electronics")]'));
console.log('   Orders completed:', doc.count('orders[?(@.status == "completed")]'));

// Sum
console.log('\n➕ Sum:');
console.log('   Total order value: $' + doc.sum('orders[*]', 'total').toFixed(2));
console.log('   Total stock:', doc.sum('products[*]', 'stock'));
console.log('   Items ordered:', doc.sum('orders[*]', 'items'));

// Average
console.log('\n📈 Average:');
console.log('   Average product price: $' + doc.avg('products[*]', 'price').toFixed(2));
console.log('   Average order value: $' + doc.avg('orders[*]', 'total').toFixed(2));
console.log('   Average rating:', doc.avg('products[*]', 'rating').toFixed(2));

// Min/Max
console.log('\n🔻🔺 Min/Max:');
console.log('   Cheapest product: $' + doc.min('products[*]', 'price'));
console.log('   Most expensive: $' + doc.max('products[*]', 'price'));
console.log('   Lowest rating:', doc.min('products[*]', 'rating'));
console.log('   Highest rating:', doc.max('products[*]', 'rating'));

// ============================================
// 2. GROUPING & DISTINCT
// ============================================
console.log('\n\n2. GROUPING & DISTINCT');
console.log('─'.repeat(50));

// Group By
console.log('\n📁 GroupBy:');
const byCategory = doc.groupBy('products[*]', 'category');
console.log('   Products by category:');
for (const [cat, products] of Object.entries(byCategory)) {
  console.log(`     ${cat}: ${(products as any[]).length} products`);
}

const byStatus = doc.groupBy('orders[*]', 'status');
console.log('\n   Orders by status:');
for (const [status, orders] of Object.entries(byStatus)) {
  console.log(`     ${status}: ${(orders as any[]).length} orders`);
}

// Distinct
console.log('\n🔹 Distinct:');
console.log('   Categories:', doc.distinct('products[*]', 'category'));
console.log('   Order statuses:', doc.distinct('orders[*]', 'status'));
console.log('   Customer countries:', doc.distinct('customers[*]', 'country'));
console.log('   Customer tiers:', doc.distinct('customers[*]', 'tier'));

// ============================================
// 3. FLUENT API CHAINS
// ============================================
console.log('\n\n3. FLUENT API CHAINS');
console.log('─'.repeat(50));

// Filter + OrderBy + Take
console.log('\n🔗 Chained Operations:');
console.log('   Top 3 expensive electronics:');
const topElectronics = doc.aggregate('products[?(@.category == "electronics")]')
  .orderBy('price', 'desc')
  .take(3)
  .toArray();
topElectronics.forEach((p: any, i: number) => {
  console.log(`     ${i + 1}. ${p.name} - $${p.price}`);
});

console.log('\n   Best rated products (rating >= 4.5):');
const bestRated = doc.aggregate('products[*]')
  .filter((p: any) => p.rating >= 4.5)
  .orderBy('rating', 'desc')
  .toArray();
bestRated.forEach((p: any) => {
  console.log(`     ${p.name} - ⭐${p.rating}`);
});

// Skip + Take (Pagination)
console.log('\n   Pagination (page 2, size 3):');
const page2 = doc.aggregate('products[*]')
  .orderBy('name', 'asc')
  .skip(3)
  .take(3)
  .toArray();
page2.forEach((p: any) => console.log(`     - ${p.name}`));

// First + Last
console.log('\n   First product:', doc.aggregate('products[*]').first()?.name);
console.log('   Last product:', doc.aggregate('products[*]').last()?.name);

// ============================================
// 4. STATISTICAL ANALYSIS
// ============================================
console.log('\n\n4. STATISTICAL ANALYSIS');
console.log('─'.repeat(50));

// Full Stats
console.log('\n📉 Price Statistics:');
const priceStats = doc.aggregate('products[*]').stats('price');
console.log(`   Count: ${priceStats.count}`);
console.log(`   Sum: $${priceStats.sum.toFixed(2)}`);
console.log(`   Avg: $${priceStats.avg.toFixed(2)}`);
console.log(`   Min: $${priceStats.min}`);
console.log(`   Max: $${priceStats.max}`);
console.log(`   Variance: ${priceStats.variance.toFixed(2)}`);
console.log(`   Std Dev: ${priceStats.stdDev.toFixed(2)}`);

// Median
console.log('\n📊 Median:');
console.log('   Median price: $' + doc.aggregate('products[*]').median('price'));
console.log('   Median rating:', doc.aggregate('products[*]').median('rating'));

// Percentile
console.log('\n📈 Percentiles:');
console.log('   25th percentile (price): $' + doc.aggregate('products[*]').percentile(25, 'price')?.toFixed(2));
console.log('   50th percentile (price): $' + doc.aggregate('products[*]').percentile(50, 'price')?.toFixed(2));
console.log('   75th percentile (price): $' + doc.aggregate('products[*]').percentile(75, 'price')?.toFixed(2));
console.log('   90th percentile (price): $' + doc.aggregate('products[*]').percentile(90, 'price')?.toFixed(2));

// Frequency
console.log('\n📊 Frequency Analysis:');
const statusFreq = doc.aggregate('orders[*]').frequency('status');
console.log('   Order status frequency:', statusFreq);

const tierFreq = doc.aggregate('customers[*]').frequency('tier');
console.log('   Customer tier frequency:', tierFreq);

// ============================================
// 5. FUNCTIONAL TRANSFORMS
// ============================================
console.log('\n\n5. FUNCTIONAL TRANSFORMS');
console.log('─'.repeat(50));

// Map
console.log('\n🔄 Map:');
const productNames = doc.aggregate('products[*]')
  .map((p: any) => p.name)
  .toArray();
console.log('   Product names:', productNames.slice(0, 5).join(', ') + '...');

const discountedPrices = doc.aggregate('products[*]')
  .map((p: any) => ({ name: p.name, discounted: p.price * 0.9 }))
  .take(3)
  .toArray();
console.log('   With 10% discount:');
discountedPrices.forEach((p: any) => console.log(`     ${p.name}: $${p.discounted.toFixed(2)}`));

// Reduce
console.log('\n🧮 Reduce:');
const totalValue = doc.aggregate('products[*]')
  .reduce((acc: number, p: any) => acc + (p.price * p.stock), 0);
console.log('   Total inventory value: $' + totalValue.toFixed(2));

// ============================================
// 6. GROUPED AGGREGATIONS
// ============================================
console.log('\n\n6. GROUPED AGGREGATIONS');
console.log('─'.repeat(50));

console.log('\n💰 Revenue by Category:');
const productsByCategory = doc.groupBy('products[*]', 'category');
for (const [category, products] of Object.entries(productsByCategory)) {
  const catTotal = aggregate(products as any[]).sum('price');
  const catAvg = aggregate(products as any[]).avg('price');
  console.log(`   ${category}: Total $${catTotal.toFixed(2)}, Avg $${catAvg.toFixed(2)}`);
}

console.log('\n👤 Orders by Customer:');
const ordersByCustomer = doc.groupBy('orders[*]', 'customerId');
for (const [customerId, orders] of Object.entries(ordersByCustomer)) {
  const customer = doc.query(`customers[?(@.id == ${customerId})]`)?.[0];
  const totalSpent = aggregate(orders as any[]).sum('total');
  const orderCount = (orders as any[]).length;
  console.log(`   ${customer?.name || 'Unknown'}: ${orderCount} orders, $${totalSpent.toFixed(2)} total`);
}

// ============================================
// 7. REAL-WORLD SCENARIOS
// ============================================
console.log('\n\n7. REAL-WORLD SCENARIOS');
console.log('─'.repeat(50));

// Scenario 1: Top Selling Categories
console.log('\n🏆 Top Selling Category by Stock:');
let topCategory = { name: '', stock: 0 };
for (const [category, products] of Object.entries(productsByCategory)) {
  const totalStock = aggregate(products as any[]).sum('stock');
  if (totalStock > topCategory.stock) {
    topCategory = { name: category, stock: totalStock };
  }
}
console.log(`   ${topCategory.name} with ${topCategory.stock} items in stock`);

// Scenario 2: Customer Insights
console.log('\n👥 Customer Insights:');
const goldCustomers = doc.query('customers[?(@.tier == "gold")]');
console.log(`   Gold tier customers: ${(goldCustomers as any[]).length}`);

const usCustomers = doc.count('customers[?(@.country == "US")]');
console.log(`   US customers: ${usCustomers}`);

// Scenario 3: Low Stock Alert
console.log('\n⚠️ Low Stock Alert (stock < 50):');
const lowStock = doc.aggregate('products[?(@.stock < 50)]')
  .orderBy('stock', 'asc')
  .toArray();
lowStock.forEach((p: any) => {
  console.log(`   ${p.name}: ${p.stock} remaining`);
});

// Scenario 4: Order Summary
console.log('\n📋 Order Summary:');
const completedOrders = doc.aggregate('orders[?(@.status == "completed")]');
console.log(`   Completed orders: ${completedOrders.count()}`);
console.log(`   Total revenue: $${completedOrders.sum('total').toFixed(2)}`);
console.log(`   Avg order value: $${completedOrders.avg('total').toFixed(2)}`);

const pendingOrders = doc.aggregate('orders[?(@.status == "pending")]');
console.log(`   Pending orders: ${pendingOrders.count()}`);
console.log(`   Pending value: $${pendingOrders.sum('total').toFixed(2)}`);

console.log('\n✅ All aggregation examples work perfectly!');
