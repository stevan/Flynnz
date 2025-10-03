# Compilation Model

## High-Level Language to VM Program

The compilation process transforms high-level expressions and statements into VM instruction sequences with **adaptive matrix format selection**.

## Compilation Pipeline

```
┌─────────────────────────────────────┐
│  1. PARSING & AST CONSTRUCTION      │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  2. DATAFLOW ANALYSIS               │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  3. OPTIMIZATION PASSES             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  4. PHASE GENERATION                │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  5. ROUTINE COMPILATION             │
│     - Generate VM instructions      │
│     - Generate dense matrices       │
│     - Analyze sparsity              │
│     - Select format per instruction │
│     - Convert to sparse (if needed) │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  6. BUFFER ALLOCATION               │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  7. VM ALLOCATION STRATEGY          │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  8. EXECUTABLE GENERATION           │
└─────────────────────────────────────┘
```

## Matrix Format Selection

```typescript
class MatrixCompiler {
  compileLinearInstruction(inst: Instruction): CompiledMatrix {
    // 1. Generate dense representation first
    const denseMatrix = this.generateDenseMatrix(inst);
    
    // 2. Analyze sparsity
    const analysis = this.analyzeSparsity(denseMatrix);
    
    // 3. Select format based on threshold
    if (analysis.sparsityRatio >= this.SPARSITY_THRESHOLD) {
      return this.compileDense(denseMatrix, analysis);
    } else {
      return this.compileSparse(denseMatrix, analysis);
    }
  }
  
  private analyzeSparsity(matrix: number[][]): SparsityAnalysis {
    let nonZeroCount = 0;
    const nonZeroPositions: [number, number][] = [];
    
    for (let row = 0; row < 22; row++) {
      for (let col = 0; col < 22; col++) {
        if (Math.abs(matrix[row][col]) > 1e-9) {
          nonZeroCount++;
          nonZeroPositions.push([row, col]);
        }
      }
    }
    
    const sparsityRatio = nonZeroCount / 484;
    const denseSize = 484 * 4;  // bytes
    const sparseSize = nonZeroCount * 4 +  // values
                       nonZeroCount * 4 +  // col_indices
                       23 * 4;             // row_pointers
    
    return {
      nonZeroCount,
      sparsityRatio,
      nonZeroPositions,
      denseSize,
      sparseSize,
      savingsIfSparse: denseSize - sparseSize,
      computeSavingsIfSparse: 484 - nonZeroCount,
    };
  }
  
  private compileDense(
    matrix: number[][],
    analysis: SparsityAnalysis
  ): CompiledMatrix {
    // Flatten to row-major order
    const data = new Float32Array(484);
    let idx = 0;
    for (let row = 0; row < 22; row++) {
      for (let col = 0; col < 22; col++) {
        data[idx++] = matrix[row][col];
      }
    }
    
    return {
      format: MatrixFormat.Dense,
      data: data.buffer,
      metadata: {
        format: 1,  // FORMAT_DENSE
        size: 1936,  // 484 * 4 bytes
        nonZeroCount: analysis.nonZeroCount,
      },
      analysis,
    };
  }
  
  private compileSparse(
    matrix: number[][],
    analysis: SparsityAnalysis
  ): CompiledMatrix {
    const values: number[] = [];
    const colIndices: number[] = [];
    const rowPointers: number[] = [0];
    
    // Convert to CSR format
    for (let row = 0; row < 22; row++) {
      for (let col = 0; col < 22; col++) {
        const value = matrix[row][col];
        if (Math.abs(value) > 1e-9) {
          values.push(value);
          colIndices.push(col);
        }
      }
      rowPointers.push(values.length);
    }
    
    // Pack into buffers
    const valuesBuffer = new Float32Array(values);
    const colIndicesBuffer = new Uint32Array(colIndices);
    const rowPointersBuffer = new Uint32Array(rowPointers);
    
    // Concatenate buffers
    const totalSize = valuesBuffer.byteLength +
                      colIndicesBuffer.byteLength +
                      rowPointersBuffer.byteLength;
    
    const combined = new ArrayBuffer(totalSize);
    const view = new Uint8Array(combined);
    
    let offset = 0;
    view.set(new Uint8Array(valuesBuffer.buffer), offset);
    offset += valuesBuffer.byteLength;
    view.set(new Uint8Array(colIndicesBuffer.buffer), offset);
    offset += colIndicesBuffer.byteLength;
    view.set(new Uint8Array(rowPointersBuffer.buffer), offset);
    
    return {
      format: MatrixFormat.Sparse,
      data: combined,
      metadata: {
        format: 0,  // FORMAT_SPARSE
        size: totalSize,
        nonZeroCount: values.length,
      },
      analysis,
    };
  }
  
  // Configurable threshold (default 15%)
  private SPARSITY_THRESHOLD = 0.15;
}
```

## Compilation Statistics Tracking

```typescript
class CompilationStats {
  private stats = {
    totalLinearInstructions: 0,
    sparseCount: 0,
    denseCount: 0,
    totalDenseSize: 0,
    totalSparseSize: 0,
    totalNonZeros: 0,
  };
  
  recordMatrix(compiled: CompiledMatrix): void {
    this.stats.totalLinearInstructions++;
    
    if (compiled.format === MatrixFormat.Sparse) {
      this.stats.sparseCount++;
      this.stats.totalSparseSize += compiled.metadata.size;
    } else {
      this.stats.denseCount++;
      this.stats.totalDenseSize += compiled.metadata.size;
    }
    
    this.stats.totalNonZeros += compiled.metadata.nonZeroCount;
  }
  
  generateReport(): string {
    const totalSize = this.stats.totalDenseSize + this.stats.totalSparseSize;
    const wouldBeAllDense = this.stats.totalLinearInstructions * 1936;
    const savings = wouldBeAllDense - totalSize;
    const savingsPercent = (savings / wouldBeAllDense) * 100;
    
    const avgNonZeros = this.stats.totalNonZeros / this.stats.totalLinearInstructions;
    const avgSparsity = avgNonZeros / 484;
    
    return `
Matrix Compilation Statistics:
==============================
Total linear instructions: ${this.stats.totalLinearInstructions}
Sparse matrices: ${this.stats.sparseCount} (${(this.stats.sparseCount / this.stats.totalLinearInstructions * 100).toFixed(1)}%)
Dense matrices: ${this.stats.denseCount} (${(this.stats.denseCount / this.stats.totalLinearInstructions * 100).toFixed(1)}%)

Storage:
  Sparse: ${(this.stats.totalSparseSize / 1024).toFixed(1)} KB
  Dense: ${(this.stats.totalDenseSize / 1024).toFixed(1)} KB
  Total: ${(totalSize / 1024).toFixed(1)} KB
  
  Would be (all dense): ${(wouldBeAllDense / 1024).toFixed(1)} KB
  Savings: ${(savings / 1024).toFixed(1)} KB (${savingsPercent.toFixed(1)}%)

Sparsity:
  Average non-zeros per matrix: ${avgNonZeros.toFixed(1)}
  Average sparsity ratio: ${(avgSparsity * 100).toFixed(1)}%
    `;
  }
}
```

---
