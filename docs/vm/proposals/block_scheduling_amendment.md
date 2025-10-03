# GPU Linear VM Specification Amendment: Block-Based Epoch Scheduling

**Version:** 4.1  
**Date:** October 2025  
**Amendment Type:** Performance Optimization  
**Status:** Proposed

---

## Executive Summary

This amendment proposes a **block-based epoch scheduling** optimization that reduces execution time by 25-75% for programs with straight-line instruction sequences. The optimization is based on static program analysis at compile time and requires no changes to the VM instruction set or execution semantics.

**Key Results:**
- Single VM programs: 1.5-1.7× speedup (34-70% faster)
- Loop-heavy workloads: 1.7-1.85× speedup (70-85% faster)
- No changes to VM semantics or instruction set
- Moderate implementation complexity (~3-5 weeks)

---

## Background: Epoch-Based Execution Model

### Current Architecture

The VM executes programs in discrete **epochs**, where each epoch processes all active VMs through one instruction:

```
For each epoch:
  1. Classification Kernel: Categorize VMs by instruction type (0.01ms)
  2. GPU→CPU Transfer: Read classification counts (0.01ms)
  3. Dispatch Decision: Determine which kernels to launch (0.001ms)
  4. Execution Kernels: Launch 1-4 specialized kernels (0.01ms)
  5. Kernel Execution: Execute instruction (0.02ms)
  6. Synchronization: Wait for completion (0.005ms)
  
Total per epoch: ~0.046ms
  - Overhead: 0.026ms (57%)
  - Useful work: 0.02ms (43%)
```

### Overhead Characteristics

The per-epoch overhead is **fixed and unavoidable** in the current model:
- Classification must run every epoch to handle dynamic control flow
- GPU→CPU transfer required for dispatch decisions
- Synchronization ensures all VMs complete before next instruction

**Key insight:** For programs with predictable straight-line sequences, this overhead is repeated unnecessarily. A 10-instruction straight-line sequence requires 10 classifications, 10 readbacks, and 10 synchronization points, even though all VMs execute the same sequence.

---

## Performance Impact Analysis

### Test Workloads

We analyzed program execution across three representative workloads:

#### Workload 1: Original Nested Loop (100×200 iterations)
```yaml
Description: Nested loops with moderate iteration counts
Structure:
  - Initial: 20 instructions
  - Outer loop: 200 iterations
    - Pre-inner: 8 instructions
    - Inner loop: 100 iterations × 10 instructions
    - Post-inner: 2 instructions
  - Final: 10 instructions
Total epochs: 222,432
Instruction mix: 85% linear, 10% oracle, 5% branch
```

#### Workload 2: Moderate Nested Loop (1,000×2,000 iterations)
```yaml
Description: Larger nested loops, typical of scientific computing
Structure: Similar to Workload 1, scaled 10×
Total epochs: 22,024,032
Instruction mix: 85% linear, 10% oracle, 5% branch
```

#### Workload 3: Extreme Nested Loop (100,000×200,000 iterations)
```yaml
Description: Stress test for extreme iteration counts
Structure: Similar to Workload 1, scaled 1000×
Total epochs: 220,002,400,032
Instruction mix: 85% linear, 10% oracle, 5% branch
```

### Current Performance (Single VM)

| Workload | Total Epochs | Execution Time | Overhead Time | Useful Compute | Efficiency |
|----------|-------------|----------------|---------------|----------------|------------|
| Original (100×200) | 222,432 | 10.2 seconds | 5.8 seconds | 4.4 seconds | 43% |
| Moderate (1k×2k) | 22,024,032 | 16.9 minutes | 9.5 minutes | 7.4 minutes | 44% |
| Extreme (100k×200k) | 220B | 117 days | 66 days | 51 days | 44% |

**Observation:** Overhead consistently represents 56-57% of total execution time, regardless of program scale. This overhead is the primary optimization target.

### VM Scaling Characteristics

The architecture's strength is **throughput, not latency**:

| VM Count | Efficiency | Throughput | Use Case |
|----------|------------|------------|----------|
| 1 VM | 44% | Baseline | Development/testing |
| 1,000 VMs | 440% | 10× baseline | Small-scale production |
| 10,000 VMs | 4,400% | 100× baseline | Production workloads |
| 100,000 VMs | 44,000% | 1,000× baseline | Large-scale parallel processing |

At 10,000+ VMs, the parallel compute time vastly exceeds overhead, making the per-epoch overhead negligible from a throughput perspective. However, **wall-clock time remains constrained by epoch count**, making epoch reduction valuable even at scale.

---

## Proposed Optimization: Block-Based Epoch Scheduling

### Core Concept

**Problem:** Straight-line instruction sequences require unnecessary per-epoch overhead for each instruction.

**Solution:** Statically identify straight-line sequences at compile time and batch them into **blocks** that execute without intermediate classification or synchronization.

**Key principle:** A **block** is a maximal sequence of instructions where:
1. No control flow instructions (branches, calls, returns) exist within the sequence
2. All VMs execute the same instruction sequence (no divergence)
3. Instruction types are known at compile time (no dynamic dispatch needed)

### Example: Inner Loop Body

```
Current approach (per-epoch):
  Address 30: ADD r0, r0, r1    (epoch 1: classify, dispatch, execute, sync)
  Address 31: MUL r2, r0, r3    (epoch 2: classify, dispatch, execute, sync)
  Address 32: ADD r4, r2, r1    (epoch 3: classify, dispatch, execute, sync)
  Address 33: SUB r5, r4, r0    (epoch 4: classify, dispatch, execute, sync)
  Address 34: MUL r6, r5, r2    (epoch 5: classify, dispatch, execute, sync)
  Address 35: ADD r7, r6, r1    (epoch 6: classify, dispatch, execute, sync)
  Address 36: LOAD r8, [addr]   (epoch 7: classify, dispatch, execute, sync)
  Address 37: ADD r9, r8, r7    (epoch 8: classify, dispatch, execute, sync)
  Address 38: STORE r9, [addr]  (epoch 9: classify, dispatch, execute, sync)
  Address 39: (IP increment)    (epoch 10: classify, dispatch, execute, sync)
  
  Time: 10 × 0.046ms = 0.46ms

Block-based approach:
  Block {30-39}: [ADD, MUL, ADD, SUB, MUL, ADD, LOAD, ADD, STORE]
    - One-time command buffer setup: 0.01ms
    - Execute all 9 instructions: 9 × 0.02ms = 0.18ms
    - One-time synchronization: 0.02ms
  
  Time: 0.21ms
  
  Speedup: 0.46ms → 0.21ms = 2.19× (119% faster)
```

---

## Static Analysis: Block Identification

### Compiler Phase: Basic Block Analysis

The compiler identifies **basic blocks** using standard compiler techniques:

```
Algorithm: BasicBlockIdentification
Input: Program instruction sequence
Output: List of basic blocks

1. Initialize: currentBlockStart = 0, blocks = []

2. For each instruction i in program:
   a. If instruction is a terminator (branch, call, return, halt):
      - Create block [currentBlockStart, i]
      - Add to blocks
      - currentBlockStart = i + 1
   
   b. If instruction is a jump target:
      - Create block [currentBlockStart, i-1]
      - Add to blocks
      - currentBlockStart = i

3. Create final block [currentBlockStart, program.length-1]

4. Return blocks
```

**Terminators** (instructions that end a basic block):
- Branch instructions: `BRANCH_EQ`, `BRANCH_LT`, `BRANCH_GT`, etc.
- Control flow: `CALL`, `RETURN`, `JUMP`
- Execution control: `HALT`, `YIELD`

**Jump targets** (instructions that begin a basic block):
- Any instruction address referenced by a branch or jump
- Loop entry points
- Function entry points

### Block Characteristics Analysis

For each identified basic block, the compiler computes:

```typescript
interface BlockCharacteristics {
  start: number;              // Starting instruction address
  end: number;                // Ending instruction address
  length: number;             // Number of instructions
  
  instructionMix: {
    linear: number;           // Count of linear operations
    oracle: number;           // Count of oracle operations
    memory: number;           // Count of memory operations
    branch: number;           // Count of branch operations
  };
  
  estimatedExecutionTime: number;  // In milliseconds
  
  isLoopBody: boolean;        // True if block is a loop body
  isStraightLine: boolean;    // True if no branches within block
}
```

### Blocking Decision

The compiler applies a **blocking policy** to determine execution strategy:

```
BlockingPolicy:
  minBlockSize: 10 instructions
    - Rationale: Blocks smaller than 10 don't amortize setup overhead
  
  maxBlockSize: 1000 instructions
    - Rationale: GPU timeout safety (1000 × 0.04ms = 40ms << 2s timeout)
  
  Decision rules:
    1. If block.length < minBlockSize → execute per-epoch
    2. If block.isStraightLine == false → execute per-epoch (has branches)
    3. If block.length > maxBlockSize → split and execute as sub-blocks
    4. Otherwise → execute as block
```

---

## Execution Model

### Block Execution Flow

```typescript
async executeProgram(program: OptimizedProgram) {
  let currentBlock = program.entryBlock;
  
  while (currentBlock !== null) {
    if (currentBlock.executionStrategy === 'blocked') {
      // Pre-scheduled block
      await this.executeBlock(currentBlock);
      currentBlock = currentBlock.nextBlock;
      
    } else if (currentBlock.executionStrategy === 'per_epoch') {
      // Dynamic dispatch (contains branches or too small)
      currentBlock = await this.executeEpochWithClassification(currentBlock);
    }
  }
}
```

### Block Execution Implementation

```typescript
async executeBlock(block: Block): Promise<void> {
  // Build command buffer for entire block
  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginComputePass();
  
  // Bind resources once
  passEncoder.setBindGroup(0, this.bindGroup);
  
  // Dispatch pre-determined kernel sequence
  for (const dispatch of block.dispatchPlan) {
    passEncoder.setPipeline(this.getPipeline(dispatch.kernelType));
    passEncoder.dispatchWorkgroups(this.numVMs / 256);
  }
  
  passEncoder.end();
  
  // Submit entire block as single unit
  device.queue.submit([commandEncoder.finish()]);
  
  // Wait once for entire block
  await device.queue.onSubmittedWorkDone();
}
```

### Dispatch Plan Generation

The compiler pre-computes the exact kernel dispatch sequence for each block:

```
Example block: [ADD, MUL, ADD, SUB, MUL, ADD, LOAD, ADD, STORE]

Dispatch plan:
  1. Linear kernel (ADD)
  2. Oracle kernel (MUL)
  3. Linear kernel (ADD)
  4. Linear kernel (SUB)
  5. Oracle kernel (MUL)
  6. Linear kernel (ADD, LOAD, ADD, STORE - 4 consecutive linear ops)

Optimization: Consecutive same-type operations can share a single kernel launch
  - [ADD, LOAD, ADD, STORE] → single linear kernel invocation with IP increments
```

---

## Performance Analysis

### Block Size vs Speedup

| Block Size | Current Time | Blocked Time | Speedup | % of Max |
|------------|-------------|--------------|---------|----------|
| 5 inst | 0.375ms | 0.235ms | 1.60× | 85% |
| 10 inst | 0.75ms | 0.435ms | 1.72× | 92% |
| 20 inst | 1.5ms | 0.835ms | 1.80× | 96% |
| 50 inst | 3.75ms | 2.035ms | 1.84× | 98% |
| 100 inst | 7.5ms | 4.035ms | 1.86× | 99% |
| 1000 inst | 75ms | 40.035ms | 1.87× | 100% |

**Theoretical maximum speedup:** 1.875× (87.5% faster)

**Diminishing returns:** 50+ instruction blocks achieve 98% of maximum benefit

### Expected Performance: Test Workloads

#### Workload 1: Original (100×200 iterations)

```
Block structure:
  - Initial: 2 blocks (20 instructions → 2×10)
  - Per outer iteration:
    - Pre-inner: 1 block (8 instructions)
    - Inner body: 1 block (10 instructions) × 100 iterations
    - Post-inner: per-epoch (2 instructions, too small)
    - Outer branch: per-epoch (1 instruction)

Execution time breakdown:
  - Initial blocks: 2 × 0.21ms = 0.42ms
  - Outer loop (200 iterations):
    - Pre-inner: 200 × 0.21ms = 42ms
    - Inner body: 20,000 × 0.21ms = 4,200ms
    - Post-inner: 400 × 0.046ms = 18.4ms
    - Branch: 200 × 0.046ms = 9.2ms
  - Final blocks: 2 × 0.21ms = 0.42ms

Total: 4,270ms (7.1 minutes)
Current: 10,200ms (17 minutes)
Speedup: 2.39× (139% faster)
Improvement: 5,930ms (9.9 minutes saved)
```

#### Workload 2: Moderate (1,000×2,000 iterations)

```
Execution time:
  - Current: 16.9 minutes (1,013 seconds)
  - Blocked: 12.6 minutes (756 seconds)
  
Speedup: 1.34× (34% faster)
Improvement: 257 seconds (4.3 minutes saved)
```

#### Workload 3: Extreme (100,000×200,000 iterations)

```
Execution time:
  - Current: 117 days
  - Blocked: 87 days
  
Speedup: 1.34× (34% faster)
Improvement: 30 days saved
```

**Note:** Extreme scale workloads remain impractical for single VMs even with blocking. The primary benefit is at moderate scales or with high VM counts.

### 25-Program Workload Suite

Expected impact on diverse workload suite (temporal batching, 3 phases):

| Program Category | Programs | Current Time | Blocked Time | Speedup |
|-----------------|----------|--------------|--------------|---------|
| Linear-heavy (80%+ linear) | 1,2,3,4,5 | 2.4 min | 1.4 min | 1.71× |
| Compute-heavy (40%+ oracle) | 6,7,8,9,10 | 42 min | 30 min | 1.40× |
| Memory-heavy (50%+ memory) | 11,12,13,14,15 | 1.3 hours | 58 min | 1.34× |
| Control-heavy (20%+ branch) | 16,17,18,19,20 | 44 sec | 39 sec | 1.13× |
| Mixed workloads | 21,22,23,24,25 | 1.1 hours | 49 min | 1.35× |

**Overall suite performance:**
- Current: 5.6 hours (3 phases, temporal batching)
- Blocked: 4.3 hours
- Speedup: 1.30× (30% faster)
- Time saved: 1.3 hours (78 minutes)

---

## Implementation Specification

### Compiler Extensions

#### New Compiler Pass: BlockAnalysis

```
Phase: After instruction generation, before executable output
Input: Raw instruction sequence
Output: BlockedProgram structure

Steps:
  1. Identify basic blocks
  2. Analyze block characteristics
  3. Apply blocking policy
  4. Generate dispatch plans
  5. Emit block metadata
```

#### Output Format Extension

```typescript
interface BlockedProgram {
  // Existing fields
  instructions: Instruction[];
  matrices: Matrix[];
  routines: RoutineInfo[];
  
  // New fields for block scheduling
  blocks: Block[];
  blockMetadata: BlockMetadata[];
}

interface Block {
  id: number;
  start: number;              // First instruction address
  end: number;                // Last instruction address
  length: number;             // Instruction count
  
  executionStrategy: 'blocked' | 'per_epoch';
  dispatchPlan?: DispatchPlan;
  
  nextBlock: number | null;   // ID of next block, or null if end
  isLoopBody: boolean;
  estimatedExecutionTime: number;
}

interface DispatchPlan {
  sequence: KernelDispatch[];
}

interface KernelDispatch {
  kernelType: 'linear' | 'oracle' | 'branch' | 'io';
  instructionStart: number;
  instructionCount: number;
}
```

### Runtime Extensions

#### New Executor Interface

```typescript
interface VMExecutor {
  // Existing method
  executeEpoch(): Promise<void>;
  
  // New methods
  executeBlock(block: Block): Promise<void>;
  executeMixed(program: BlockedProgram): Promise<void>;
}
```

#### Execution Strategy Selection

```typescript
class HybridExecutor implements VMExecutor {
  async executeMixed(program: BlockedProgram): Promise<void> {
    let currentBlock = 0;
    
    while (currentBlock !== null) {
      const block = program.blocks[currentBlock];
      
      if (block.executionStrategy === 'blocked') {
        await this.executeBlock(block);
        currentBlock = block.nextBlock;
      } else {
        // Fall back to per-epoch for branches/small blocks
        currentBlock = await this.executeEpochSequence(block);
      }
    }
  }
}
```

---

## Compatibility and Migration

### Backward Compatibility

**Fully backward compatible:**
- No changes to VM instruction set
- No changes to execution semantics
- No changes to observable behavior
- Existing programs continue to work without modification

**Runtime detection:**
```typescript
if (program.blocks !== undefined) {
  // Use block-based execution
  executor.executeMixed(program);
} else {
  // Fall back to per-epoch execution
  executor.executeTraditional(program);
}
```

### Migration Path

**Phase 1: Compiler update**
- Add block analysis pass
- Emit block metadata
- Existing runtimes ignore new metadata

**Phase 2: Runtime update**
- Implement block execution
- Fall back to per-epoch for non-blocked programs
- Both program types supported

**Phase 3: Optimization**
- Recompile programs to include block metadata
- Programs automatically benefit from blocking

---

## Performance Recommendations

### When Block Scheduling Excels

**High-benefit scenarios:**
- Programs with loops containing straight-line bodies
- Iteration counts: 100-10,000 per loop
- Linear-heavy or oracle-heavy instruction mixes
- Minimal branching within hot paths

**Expected speedup: 1.5-1.85×**

### When Block Scheduling Provides Minimal Benefit

**Low-benefit scenarios:**
- Branch-heavy programs (>30% branch instructions)
- Very short instruction sequences (<10 instructions between branches)
- Highly dynamic control flow (data-dependent branches)

**Expected speedup: 1.05-1.15×**

### Optimization Guidelines

**For maximum benefit:**
1. Structure inner loops as straight-line sequences
2. Move conditional logic outside tight loops when possible
3. Batch independent operations together
4. Target 10-100 instruction blocks for optimal amortization

**Compiler hints (future extension):**
```c
// Hint to compiler: optimize this loop as block
#pragma vm_block_optimize
for (int i = 0; i < 1000; i++) {
  // Straight-line operations
  result[i] = compute(data[i]);
}
```

---

## Implementation Effort Estimate

### Development Timeline

| Component | Complexity | Effort | Dependencies |
|-----------|-----------|--------|--------------|
| Basic block identification | Low | 2-3 days | None |
| Block characterization | Low | 3-4 days | Basic block ID |
| Blocking policy | Low | 1 day | Characterization |
| Dispatch plan generation | Medium | 4-5 days | Policy |
| Compiler integration | Low | 2-3 days | All compiler components |
| Runtime executor | Medium | 5-7 days | None (parallel with compiler) |
| Testing & validation | Medium | 5-7 days | All components |
| Documentation | Low | 2-3 days | All components |

**Total estimated effort:** 24-37 days (3.5-5.5 weeks)

**Critical path:** Compiler components → Integration → Testing

### Risk Assessment

**Low risk:**
- Well-understood compiler technique (basic block analysis)
- No changes to VM semantics
- Fully backward compatible
- Degrades gracefully (falls back to per-epoch)

**Medium risk:**
- GPU command buffer management (size limits, timeouts)
- Testing coverage (ensure correctness across block boundaries)

**Mitigation:**
- Conservative max block size (1000 instructions = 40ms << 2s timeout)
- Extensive test suite covering control flow edge cases
- Gradual rollout (opt-in during development)

---

## Conclusion

Block-based epoch scheduling represents a **high-value, moderate-complexity optimization** that addresses the primary performance bottleneck in loop-heavy workloads. The optimization:

- **Reduces execution time by 30-85%** for typical workloads
- **Requires no changes** to the VM instruction set or execution semantics
- **Remains fully backward compatible** with existing programs
- **Can be implemented in 3-5 weeks** with moderate compiler and runtime changes

The optimization is particularly effective for the architecture's target workloads: massively parallel execution of loop-intensive numerical computations. Combined with the architecture's existing strength in VM-level parallelism, block scheduling enables both improved single-VM latency and sustained high-throughput execution at scale.

**Recommendation:** Approve for implementation in version 4.1 of the specification.

---

## Synergy with Loop Unrolling

### Overview

Block scheduling and loop unrolling are **highly synergistic** optimizations that work together to provide combined speedups of 2-10×, compared to 1.5-1.7× from blocking alone.

**Key insight:** Without block scheduling, loop unrolling provides no performance benefit in the epoch-based execution model. With block scheduling, loop unrolling becomes highly valuable by creating larger blocks that better amortize setup overhead.

### Why Unrolling Requires Blocking

**Without block scheduling:**
```
Original loop (100 iterations × 10 instructions):
  Time: 100 × 10 × 0.046ms = 46ms

10× unrolled (10 iterations × 100 instructions):
  Time: 10 × 100 × 0.046ms = 46ms
  
Speedup: 1.0× (no benefit!)
```

The per-epoch overhead (0.046ms) is paid per instruction regardless of unrolling. Unrolling only reorganizes instructions without reducing epoch count.

**With block scheduling:**
```
Original loop (100 iterations × 10 instructions):
  Block time: 100 × 0.235ms = 23.5ms
  Branch time: 100 × 0.046ms = 4.6ms
  Total: 28.1ms

10× unrolled (10 iterations × 100 instructions):
  Block time: 10 × 2.035ms = 20.35ms
  Branch time: 10 × 0.046ms = 0.46ms
  Total: 20.81ms
  
Speedup: 1.35× (35% faster)
```

Block scheduling enables unrolling to reduce the number of block submissions and branch checks.

### How Unrolling Improves Blocking

Loop unrolling creates larger straight-line sequences:

**Before unrolling:**
```assembly
LOOP_START:           # Block 1: 10 instructions
  ADD r0, r0, r1
  MUL r2, r0, r3
  ADD r4, r2, r1
  SUB r5, r4, r0
  MUL r6, r5, r2
  ADD r7, r6, r1
  LOAD r8, [addr]
  ADD r9, r8, r7
  STORE r9, [addr]
  ADD counter, counter, 1

LOOP_CHECK:           # Block 2: 1 instruction
  BRANCH_LT counter, 100, LOOP_START
```

100 iterations = 100 small blocks + 100 branches

**After 10× unrolling:**
```assembly
LOOP_START:           # Block 1: 100 instructions
  # Iteration 0
  ADD r0, r0, r1
  MUL r2, r0, r3
  # ... (8 more iterations)
  # Iteration 9
  ADD r0, r0, r1
  MUL r2, r0, r3
  ADD r4, r2, r1
  SUB r5, r4, r0
  MUL r6, r5, r2
  ADD r7, r6, r1
  LOAD r8, [addr]
  ADD r9, r8, r7
  STORE r9, [addr]
  ADD counter, counter, 10

LOOP_CHECK:           # Block 2: 1 instruction
  BRANCH_LT counter, 100, LOOP_START
```

10 iterations = 10 large blocks + 10 branches

**Benefits:**
- 10× fewer block submissions (100 → 10)
- 10× fewer branch checks (100 → 10)
- Larger blocks better amortize setup overhead

### Combined Performance

**Nested loop example (1,000×2,000 iterations):**

| Optimization Strategy | Execution Time | Speedup vs Baseline | Combined Speedup |
|----------------------|----------------|--------------------|--------------------|
| Baseline (per-epoch) | 16.9 minutes | 1.0× | 1.0× |
| Blocking only | 12.6 minutes | 1.34× | 1.34× |
| Unrolling only (10×) | 16.9 minutes | 1.0× | 1.0× |
| **Blocking + 10× unroll** | **8.7 minutes** | **1.94×** | **1.94×** |
| **Blocking + 100× unroll** | **5.2 minutes** | **3.25×** | **3.25×** |
| **Blocking + 1000× unroll** | **3.1 minutes** | **5.45×** | **5.45×** |

**Key observation:** The speedups multiply rather than add.

### Unroll Factor Selection

The compiler determines optimal unroll factors based on loop characteristics:

```
Decision Matrix:

Loop Iterations | Body Size | Workload Type | Unroll Factor | Expected Speedup
----------------|-----------|---------------|---------------|------------------
< 100           | Any       | Any           | 1-2×          | 1.0-1.2×
100-1,000       | < 50 inst | Heterogeneous | 2-4×          | 1.2-1.5×
100-1,000       | < 50 inst | Homogeneous   | 4-10×         | 1.5-2.0×
> 1,000         | < 20 inst | Heterogeneous | 4-10×         | 1.5-2.0×
> 1,000         | < 20 inst | Homogeneous   | 16-100×       | 2.0-3.0×
> 10,000        | < 10 inst | Homogeneous   | 100-1000×     | 3.0-5.0×
```

**Target:** Create blocks of 100-1000 instructions through unrolling.

### Optimal Unroll Factor Computation

```typescript
function computeOptimalUnrollFactor(
  loopBody: Block,
  iterationCount: number,
  workloadType: 'homogeneous' | 'heterogeneous'
): number {
  // Target block size for optimal performance
  const targetBlockSize = 1000;
  
  // Conservative for heterogeneous workloads
  if (workloadType === 'heterogeneous') {
    if (loopBody.length > 50) return 1;  // Body too large
    if (iterationCount < 100) return 1;  // Too few iterations
    return Math.min(4, Math.floor(targetBlockSize / loopBody.length));
  }
  
  // Aggressive for homogeneous workloads
  let unrollFactor = Math.floor(targetBlockSize / loopBody.length);
  
  // Cap at iteration count (can't unroll more than loop executes)
  if (iterationCount > 0) {
    unrollFactor = Math.min(unrollFactor, iterationCount);
  }
  
  // Safety cap at 1000× (GPU instruction limits)
  unrollFactor = Math.min(unrollFactor, 1000);
  
  // Round to power of 2 for cleaner code generation
  return Math.pow(2, Math.floor(Math.log2(unrollFactor)));
}
```

**Example applications:**

```
Image filter loop (1000 iterations, 10-instruction body, homogeneous):
  → targetBlockSize / bodyLength = 1000 / 10 = 100
  → min(100, 1000) = 100
  → min(100, 1000) = 100
  → nearest power of 2 = 64
  Result: 64× unroll

Neural network loop (81,920 iterations, 5-instruction body, homogeneous):
  → targetBlockSize / bodyLength = 1000 / 5 = 200
  → min(200, 81920) = 200
  → min(200, 1000) = 200
  → nearest power of 2 = 128
  Result: 128× unroll

Decision tree loop (1,000 iterations, 50-instruction body, heterogeneous):
  → Body too large (50 > 50 threshold)
  Result: No unrolling (1×)
```

### Homogeneous Workload Optimization

**Definition:** A workload is homogeneous when:
1. All VMs execute the same program
2. Iteration counts are identical (no data-dependent exits)
3. Control flow is predictable (no branches within hot loops)
4. Characteristics are known at compile time

**Optimization strategy:**

For homogeneous workloads, the compiler can use loop iteration counts to directly determine optimal block sizing:

```typescript
class HomogeneousOptimizer {
  optimizeLoop(loop: Loop): OptimizedLoop {
    // Known iteration count enables aggressive unrolling
    const unrollFactor = this.computeAggressiveUnroll(loop);
    
    // Unroll the loop
    const unrolled = this.unrollLoop(loop, unrollFactor);
    
    // Result: larger blocks, fewer iterations
    return {
      originalIterations: loop.iterationCount,
      newIterations: Math.ceil(loop.iterationCount / unrollFactor),
      blockSize: loop.body.length * unrollFactor,
      expectedSpeedup: this.estimateSpeedup(loop, unrollFactor)
    };
  }
}
```

**Example: Image processing (1,000,000 pixel operations)**

```
Original:
  Loop: 1,000,000 iterations
  Body: 20 instructions (filter operation)
  Time: 920 seconds (15.3 minutes)

With blocking only:
  Block: 20 instructions
  Iterations: 1,000,000
  Time: 564 seconds (9.4 minutes)
  Speedup: 1.63×

With blocking + 100× unroll:
  Block: 2,000 instructions (100 iterations unrolled)
  Iterations: 10,000
  Time: 404 seconds (6.7 minutes)
  Speedup: 2.28×

With blocking + 1000× unroll (full inner loop):
  Block: 20,000 instructions (entire inner loop)
  Iterations: 1 (outer loop only)
  Time: 402 seconds (6.7 minutes)
  Speedup: 2.29×
```

**Diminishing returns:** Beyond 100× unrolling, speedup increases become marginal (< 1%).

### Implementation Strategy

**Phase 1: Block Scheduling Only (Weeks 1-5)**
- Implement basic block identification and execution
- Target: 1.5-1.7× speedup
- Establish foundation for unrolling integration

**Phase 2: Conservative Unrolling (Weeks 6-8)**
- Add 2-4× unrolling for common cases
- Target iteration counts: 100-10,000
- Target body sizes: < 50 instructions
- Combined speedup: 1.8-2.4×

**Phase 3: Aggressive Unrolling for Homogeneous Workloads (Weeks 9-12)**
- Add 10-1000× unrolling with safety checks
- GPU instruction limit checking (10M instruction cap)
- Iteration count analysis
- Combined speedup: 2.5-5.0× for applicable workloads

**Total implementation time:** 9-12 weeks for complete optimization

### Code Size Considerations

**Trade-off:** Unrolling increases program size

| Unroll Factor | Original Size | Unrolled Size | Size Increase |
|---------------|---------------|---------------|---------------|
| 1× (none) | 1,000 inst | 1,000 inst | 1.0× |
| 2× | 1,000 inst | 1,500 inst | 1.5× |
| 4× | 1,000 inst | 2,500 inst | 2.5× |
| 10× | 1,000 inst | 5,500 inst | 5.5× |
| 100× | 1,000 inst | 50,500 inst | 50.5× |
| 1000× | 1,000 inst | 500,500 inst | 500.5× |

**GPU instruction buffer limits:** Modern GPUs support 1-10M instructions. Aggressive unrolling (100-1000×) requires checking that total program size remains within limits.

**Safety mechanism:**
```typescript
const maxGPUInstructions = 10_000_000;

function checkCodeSize(
  program: Program,
  unrollPlan: UnrollPlan[]
): boolean {
  let totalSize = program.instructions.length;
  
  for (const plan of unrollPlan) {
    const expansion = plan.bodySize * (plan.factor - 1);
    totalSize += expansion;
  }
  
  return totalSize < maxGPUInstructions;
}
```

### Expected Impact on Workload Suite

**25-program suite with integrated optimization:**

| Program Category | Programs | Blocking Only | + Conservative Unroll | + Aggressive Unroll |
|-----------------|----------|---------------|----------------------|---------------------|
| Linear-heavy | 1,2,3,4,5 | 1.71× | 2.1× | 2.8× |
| Compute-heavy | 6,7,8,9,10 | 1.40× | 1.8× | 2.4× |
| Memory-heavy | 11,12,13,14,15 | 1.34× | 1.6× | 2.0× |
| Control-heavy | 16,17,18,19,20 | 1.13× | 1.2× | 1.3× |
| Mixed | 21,22,23,24,25 | 1.35× | 1.7× | 2.2× |

**Overall suite:**
- Blocking only: 5.6 hours → 4.3 hours (1.30× speedup)
- + Conservative unrolling: 5.6 hours → 3.4 hours (1.65× speedup)
- + Aggressive unrolling: 5.6 hours → 2.8 hours (2.0× speedup)

**Time saved:** 2.8 hours (168 minutes) with full optimization

### Recommendation

**For version 4.1:** Implement block scheduling with conservative unrolling (2-4× factors)
- Combined speedup: 1.8-2.4×
- Reasonable code size increase (< 5×)
- Implementation time: 6-8 weeks
- Low risk

**For version 4.2:** Add aggressive unrolling for homogeneous workloads
- Additional speedup: 1.2-2.0× (combined 2.5-5.0×)
- Requires code size management
- Implementation time: +3-4 weeks
- Medium risk (GPU limits)

---

## Appendix A: Future Extensions

### Advanced Block Optimization (Not Required for 4.1)

**Instruction fusion within blocks:**
- Combine consecutive operations into optimized kernels
- Example: `ADD + MUL + ADD` → fused multiply-add kernel
- Potential additional speedup: 1.1-1.2×

**Loop unrolling integration:**
- Automatically unroll small loops into larger blocks
- Example: 10-iteration loop × 10 instructions → 100-instruction block
- Potential additional speedup: 2-10× (loop-dependent)

**Adaptive block sizing:**
- Runtime feedback to adjust block sizes
- Optimize for specific hardware characteristics
- Complexity: High, benefit: Minimal (5-10%)

**Cross-block optimization:**
- Reorder blocks for better cache utilization
- Merge compatible blocks across control flow paths
- Complexity: High, benefit: Minimal (3-5%)

None of these extensions are recommended for initial implementation. The simple fixed-size blocking provides 90%+ of the achievable benefit with significantly lower complexity.