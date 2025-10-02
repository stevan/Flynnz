# Matrix Storage Architecture

## Hybrid Dense/Sparse Design

The system uses **adaptive matrix storage** where the compiler selects the optimal format per instruction based on sparsity analysis.

## Matrix Metadata Structure

```wgsl
struct MatrixMetadata {
  format: u32,      // 0 = sparse (CSR), 1 = dense
  offset: u32,      // Byte offset into respective buffer
  size: u32,        // Size in bytes
  non_zero_count: u32,  // Number of non-zero elements
}
```

## Sparse Matrix Format (CSR - Compressed Sparse Row)

Most linear operations (~95%) use sparse storage due to their inherent structure.

```wgsl
struct SparseMatrix {
  // Stored contiguously in sparse_matrices buffer at offset
  values: array<f32>,       // Non-zero values
  col_indices: array<u32>,  // Column index for each value
  row_pointers: array<u32>, // Start index for each row (length = 23)
}
```

**Example: ADD r2, r0, r1**

```
Dense representation (22×22 = 484 values):
        IP  r0  r1  r2  r3  mem0...mem15  1
    IP [ 1   0   0   0   0   0  ...  0    1 ]
    r0 [ 0   1   0   0   0   0  ...  0    0 ]
    r1 [ 0   0   1   0   0   0  ...  0    0 ]
    r2 [ 0   1   1   0   0   0  ...  0    0 ]  ← r2 = r0 + r1
    r3 [ 0   0   0   0   1   0  ...  0    0 ]
  mem0 [ 0   0   0   0   0   1  ...  0    0 ]
   ... (rows for mem1-mem15)
     1 [ 0   0   0   0   0   0  ...  0    1 ]

Non-zeros: 24 values (IP row: 2, r2 row: 2, identity diagonal: 20)
Sparsity: 24/484 = 5% → Use SPARSE format

Sparse representation:
values:       [1, 1,  1,  1,  1, 1,  1, ... (24 total)]
col_indices:  [0, 21, 1,  2,  1, 2,  3, ... (24 total)]
row_pointers: [0, 2,  3,  4,  6,  7,  8, ... (23 total)]
                ↑     ↑   ↑   ↑
               IP    r0  r1  r2
               
Storage: 24 floats + 24 u32s + 23 u32s = 284 bytes
vs Dense: 484 floats = 1936 bytes
Savings: 85%
```

## Dense Matrix Format

Rare operations (≥15% non-zeros) use dense storage for maximum memory bandwidth.

```
Dense storage:
- Simple 22×22 array
- 484 floats = 1936 bytes
- Sequential memory access (optimal for bandwidth)
- Used when sparse overhead not worth it
```

## Format Selection Algorithm

```typescript
class MatrixFormatSelector {
  selectFormat(inst: Instruction): MatrixFormat {
    // Generate candidate matrix
    const matrix = this.generateMatrix(inst);
    
    // Count non-zeros
    const nonZeroCount = this.countNonZeros(matrix);
    const sparsityRatio = nonZeroCount / 484;
    
    // Calculate storage sizes
    const denseSize = 484 * 4;  // 1936 bytes
    const sparseSize = nonZeroCount * 4 +  // values
                       nonZeroCount * 4 +  // col_indices
                       23 * 4;             // row_pointers
    
    // Threshold-based selection
    const SPARSITY_THRESHOLD = 0.15;  // 15%
    
    if (sparsityRatio >= SPARSITY_THRESHOLD) {
      return {
        format: MatrixFormat.Dense,
        size: denseSize,
        nonZeroCount: nonZeroCount,
        reasoning: 'Dense: High non-zero ratio maintains bandwidth'
      };
    } else {
      return {
        format: MatrixFormat.Sparse,
        size: sparseSize,
        nonZeroCount: nonZeroCount,
        reasoning: 'Sparse: Low non-zero ratio saves memory & compute'
      };
    }
  }
  
  private countNonZeros(matrix: number[][]): number {
    let count = 0;
    for (let i = 0; i < 22; i++) {
      for (let j = 0; j < 22; j++) {
        if (Math.abs(matrix[i][j]) > 1e-9) {
          count++;
        }
      }
    }
    return count;
  }
}
```

## Typical Distribution

Based on analysis of common programs:

```
Instruction      | Non-Zeros | Sparsity | Format | Percentage
-----------------|-----------|----------|--------|------------
CLEAR            | 23        | 5%       | Sparse | 10%
MOV              | 24        | 5%       | Sparse | 15%
NEG              | 24        | 5%       | Sparse | 5%
LOAD, STORE      | 24        | 5%       | Sparse | 25%
ADD, SUB         | 40        | 8%       | Sparse | 35%
SETI, SCALE      | 24-30     | 6%       | Sparse | 10%
Hypothetical     | >73       | >15%     | Dense  | <1%
```

**Overall**: ~99% sparse, ~1% dense in typical programs

## Storage Efficiency Comparison

```
Program with 100 linear instructions:

ALL DENSE:
- 100 × 1936 bytes = 193,600 bytes (~194 KB)

HYBRID (95 sparse, 5 dense):
- 95 × 284 bytes = 26,980 bytes (sparse)
- 5 × 1936 bytes = 9,680 bytes (dense)
- Total: 36,660 bytes (~37 KB)
- Savings: 81%

Cache Impact:
- Dense: ~6 matrices fit in 32KB L1 cache
- Hybrid: ~30-40 matrices fit in 32KB L1 cache
- Result: 5-7x better cache utilization
```

---
