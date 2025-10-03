# Compiler Optimizations

## 1. Operation Fusion

Combine multiple operations into single routine:

```typescript
// Before: 3 routines
data.map(x => x * 2).map(x => x + 1).map(x => x / 3);

// After: 1 fused routine
data.map(x => (x * 2 + 1) / 3);

// Benefits:
// - 3 phases → 1 phase
// - 9 memory ops → 2 memory ops
// - 67% fewer epochs
```

## 2. Partial Evaluation

Bake compile-time constants into routines:

```typescript
// Before: Load parameters at runtime
process(data, threshold=100, scale=2.0);

// After: Constants in instruction immediates
CMPI r4, r1, 100    // threshold baked in
MULI r1, r1, 2      // scale baked in

// Benefits:
// - 2 fewer memory operations per VM
// - Smaller instruction count
// - Enables further optimizations
```

## 3. Loop Unrolling

Eliminate branches for small fixed loops:

```typescript
// Before: 5-iteration loop with branch
for (let i = 0; i < 5; i++) { work(i); }

// After: Unrolled, no branches
work(0); work(1); work(2); work(3); work(4);

// Benefits:
// - No branch instructions
// - 62% fewer epochs
// - Enables constant propagation
```

---
