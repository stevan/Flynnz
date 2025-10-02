# Execution Patterns

## 1. SIMD Pattern

All VMs execute identical routine with different data:

```typescript
pixels.map(pixel => toGrayscale(pixel));

// Execution: 1000 VMs, all at same IP
// Perfect parallelism
```

## 2. Tree Reduction Pattern

Hierarchical aggregation across phases:

```typescript
data.reduce((acc, x) => acc + x, 0);

// Phase 1: 1000 VMs reduce 1000 elements each
// Phase 2-11: Logarithmic tree reduction
// Total: 11 phases vs 1M sequential operations
```

## 3. Pipeline Pattern

Streaming data through stages:

```typescript
// Producer-consumer with ring buffer
producer → buffer → consumer

// Both run simultaneously
// Throughput limited by slower stage
```

## 4. Dataflow Pattern

Complex dependency graphs:

```typescript
// Parallel preprocessing
let grayscale = toGrayscale(image);
let edges = detectEdges(image);  // Independent!

// Combined processing
let combined = combine(grayscale, edges);
```

---
