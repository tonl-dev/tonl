// Let's verify what [7:3:-1] should actually return
const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

console.log("Array indices and values:");
for (let i = 0; i < arr.length; i++) {
  console.log(`Index ${i}: ${arr[i]}`);
}

console.log("\nSlice [7:3:-1] analysis:");
console.log("Start at index 7 (value 8)");
console.log("Step -1, go backwards");
console.log("Stop when index > 3");
console.log("\nIndices to include:");
for (let i = 7; i > 3; i--) {
  console.log(`Index ${i}: ${arr[i]}`);
}

console.log("\nValues: [8, 7, 6, 5]");
console.log("\nThe test expects [8, 7, 6, 5, 4] which would include index 4 (value 5)");
console.log("But index 4 is NOT > 3, so it should be excluded.");
console.log("\nTherefore, my implementation is correct and the test expectation is wrong.");