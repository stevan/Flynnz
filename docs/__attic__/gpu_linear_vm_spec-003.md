# GPU-Accelerated Linear Algebra Virtual Machine
## Complete Architecture Specification

**Version:** 3.0  
**Date:** October 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Architectural Layers](#architectural-layers)
3. [VM Core Architecture](#vm-core-architecture)
4. [State Representation](#state-representation)
5. [Instruction Model](#instruction-model)
6. [Memory Architecture](#memory-architecture)
7. [Kernel Architecture](#kernel-architecture)
8. [Compilation Model](#compilation-model)
9. [Execution Model](#execution-model)
10. [Control Flow](#control-flow)
11. [Compiler Optimizations](#compiler-optimizations)
12. [Execution Patterns](#execution-patterns)
13. [Performance Characteristics](#performance-characteristics)
14. [Implementation Guide](#implementation-guide)
15. [Use Cases](#use-cases)
16. [Future Extensions](#future-extensions)

---

## Overview

This virtual machine architecture represents program execution as linear algebra transformations, enabling massive parallelization on GPUs. The system consists of three layers:

1. **High-Level Language**: Multi-paradigm programming with expressions and statements
2. **VM Layer**: Routines compiled to instruction sequences with transformation matrices
3. **GPU Hardware**: Five specialized kernels executing linear algebra and specialized operations

### Core Design Principles

**Hierarchical Execution**: Small instruction sequences (routines) serve as "microcode" beneath a higher-level language, enabling compile-time optimization and static scheduling.

**Harvard Architecture**: Instructions stored separately from VM memory, enabling pure functional transformations.

**Hybrid Computation**: 
- Linear operations (60-80%): Pure matrix transformations with zero thread divergence
- Non-linear operations (20-30%): Exact computation via specialized GPU kernels
- Control flow: Scheduler-based rescheduling without matrix encoding

**Static Knowledge**: Compiler has complete visibility into program structure, enabling:
- Dependency analysis and dataflow optimization
- Expression/statement boundaries as synchronization points
- Pre-allocated communication buffers
- Optimal VM allocation strategies

---

## Architectural Layers

### Complete System Architecture

```
┌──────────────────────────────────────────────────┐
│        HIGH-LEVEL LANGUAGE                       │
│                                                  │
│  - Expressions & Statements                      │
│  - Functions & Closures                          │
│  - Control Flow (if/for/while)                   │
│  - Data Structures                               │
│                                                  │
│  Example:                                        │
│    let a = processA(input);                      │
│    let b = processB(input);                      │
│    let c = combine(a, b);                        │
└────────────────┬─────────────────────────────────┘
                 │ Compilation & Optimization
                 ↓
┌──────────────────────────────────────────────────┐
│        INTERMEDIATE REPRESENTATION               │
│                                                  │
│  - Dependency Graph (Dataflow Analysis)          │
│  - Expression Boundaries                         │
│  - Communication Patterns                        │
│  - Resource Requirements                         │
│                                                  │
│  Output:                                         │
│    Phase 1: [processA, processB] (parallel)      │
│    Phase 2: [combine] (depends on Phase 1)       │
└────────────────┬─────────────────────────────────┘
                 │ Code Generation
                 ↓
┌──────────────────────────────────────────────────┐
│        VM PROGRAM (Executable)                   │
│                                                  │
│  Routines:                                       │
│    - processA: Instructions[0..15]               │
│    - processB: Instructions[16..30]              │
│    - combine:  Instructions[31..45]              │
│                                                  │
│  Matrices:                                       │
│    - Transformation matrices for linear ops      │
│                                                  │
│  Metadata:                                       │
│    - Phase boundaries                            │
│    - Buffer allocations                          │
│    - VM counts per routine                       │
└────────────────┬─────────────────────────────────┘
                 │ Runtime Execution
                 ↓
┌──────────────────────────────────────────────────┐
│        GPU RUNTIME & SCHEDULER                   │
│                                                  │
│  Phase 1:                                        │
│    - Launch 500 VMs for processA                 │
│    - Launch 500 VMs for processB                 │
│    - Execute until all halt                      │
│    - Barrier synchronization                     │
│                                                  │
│  Phase 2:                                        │
│    - Launch 1000 VMs for combine                 │
│    - Execute until all halt                      │
└────────────────┬─────────────────────────────────┘
                 │ Epoch-by-Epoch Execution
                 ↓
┌──────────────────────────────────────────────────┐
│        GPU KERNELS                               │
│                                                  │
│  Epoch 1:                                        │
│    1. Classification Kernel                      │
│    2. Linear Kernel (if linear ops present)      │
│    3. Oracle Kernel (if oracle ops present)      │
│    4. Branch Kernel (if branches present)        │
│    5. I/O Kernel (if I/O ops present)            │
│                                                  │
│  Epoch 2: (repeat for next instruction)          │
└──────────────────────────────────────────────────┘
```

### Terminology Hierarchy

```
Program
  └─ The complete executable containing all routines
  
Phase
  └─ Group of routines that can execute concurrently
  └─ Determined by dependency analysis (topological levels)
  └─ Barrier synchronization between phases
  
Routine
  └─ Sequence of VM instructions compiled from one high-level operation
  └─ Entry point: Starting IP address
  └─ Example: "processA routine" = instructions[0..15]
  
Instruction
  └─ Single VM operation (ADD, MUL, BRANCH, etc.)
  └─ Stored in program[] array
  └─ May have associated transformation matrix (linear ops)
  
Epoch
  └─ One execution step where all active VMs execute one instruction
  └─ Finest-grained synchronization unit
```

**Example**:
```
Program: "Image Processing"
  ├─ Phase 1 (dependency level 0)
  │   ├─ Routine: toGrayscale (IP 0-8, 9 instructions)
  │   │   └─ SYSCALL_VMID, MUL, SYSCALL_READ, ...
  │   └─ No other routines (sequential dependency)
  │
  ├─ Phase 2 (dependency level 1)
  │   └─ Routine: gaussianBlur (IP 9-20, 12 instructions)
  │       └─ SYSCALL_VMID, LOAD, MUL, ADD, ...
  │
  └─ Phase 3 (dependency level 2)
      └─ Routine: sobelEdgeDetect (IP 21-35, 15 instructions)
          └─ SYSCALL_VMID, LOAD, MUL, ...

Execution Timeline:
  Phase 1: Launch 1000 VMs at IP=0
    Epoch 1: All VMs execute instruction 0 (SYSCALL_VMID)
    Epoch 2: All VMs execute instruction 1 (MUL)
    ...
    Epoch 9: All VMs execute instruction 8 (HALT)
    [Barrier: Wait for all VMs to halt]
  
  Phase 2: Launch 1000 VMs at IP=9
    Epoch 1: All VMs execute instruction 9
    ...
    [Barrier]
  
  Phase 3: Launch 1000 VMs at IP=21
    ...
```

---

## VM Core Architecture

### Design Overview

Each VM instance is a minimal execution unit with:
- **4 general-purpose registers** (32 bits floating-point each)
- **16 memory locations** (32 bits floating-point each)
- **1 instruction pointer** (float for matrix operations, cast to integer for indexing)
- **Metadata** (VM ID, stack pointer, status flags)

VMs execute in lockstep within epochs, but can be at different instruction addresses (different routines).

### Harvard Architecture

**Instruction Storage**: Separate from VM memory
```
program[] array (read-only)
  └─ Contains all instructions for all routines
  └─ Accessed via instruction pointer (IP)
  └─ Never modified during execution

matrices[] array (read-only)
  └─ Contains 22×22 transformation matrices
  └─ Only for linear operations (opcodes 0-9)
  └─ Indexed by: matrix_offset = ip * 484

vm_states[] array (read-write)
  └─ Contains state for each VM instance
  └─ Modified by kernel execution
```

**Benefit**: Enables pure functional transformations - instructions are immutable mathematical operators.

---

## State Representation

### VMState Structure

Each VM instance maintains state in two parts:

#### 1. Transformation Vector (22 floats)

This vector participates in matrix multiplication operations:

```
[IP, r0, r1, r2, r3, mem0, mem1, ..., mem15, 1]
 │   └────┬────┘ └──────────┬──────────┘  │
 │        │                  │              │
 │        │                  │              └─ Homogeneous coordinate (constant 1.0)
 │        │                  └─────────────── 16 memory locations
 │        └───────────────────────────────── 4 general-purpose registers
 └────────────────────────────────────────── Instruction pointer (float for matrix ops)
```

**Size**: 22 floats × 4 bytes = 88 bytes per VM transformation vector

**Why Floating Point IP?**: The entire state vector undergoes matrix multiplication in the linear kernel. Matrix operations require uniform types (all floats). Linear transformations can increment IP: `new_IP = old_IP + 1.0`. The cost of casting (`u32(state.IP)` for indexing) is negligible compared to the benefit of pure linear algebra operations.

#### 2. Metadata Structure (not in transformation vector)

Additional state tracked separately for scheduling and control flow:

```wgsl
struct VMState {
  // Transformation vector (22 floats) - participates in matrix operations
  IP: f32,
  registers: array<f32, 4>,
  memory: array<f32, 16>,
  homogeneous: f32,  // Always 1.0
  
  // Metadata (not transformed by matrices) - used for scheduling
  vm_id: u32,         // Unique identifier for this VM instance
  stack_pointer: u32, // Index into call_stack for function calls
  status: u32,        // RUNNING, BLOCKED, YIELDED, HALTED
  _padding: u32,      // Alignment to 128 bytes
}
```

**Total Size**: 128 bytes per VM (aligned for GPU memory coalescing)

**Rationale**: Stack pointer and VM ID are not mathematical state that participates in linear transformations. They're metadata for the scheduler and control flow kernels. Keeping them separate preserves the 22×22 matrix size while adding necessary bookkeeping.

---

## Instruction Model

### Instruction Structure

All instructions are stored in a unified format:

```wgsl
struct Instruction {
  opcode: u32,
  operands: array<u32, 4>,  // Flexible: registers, addresses, immediates
}
```

**Size**: 20 bytes per instruction (5 × 4-byte values)

### Storage Layout

Instructions exist in two forms:

1. **Instruction Metadata** (`program: array<Instruction>`)
   - Compact representation: 20 bytes per instruction
   - Used by classification kernel to determine instruction type
   - Contains operand information for all instruction types
   - Indexed by IP: `inst = program[u32(state.IP)]`

2. **Transformation Matrices** (`matrices: array<f32>`)
   - Only for linear operations (opcodes 0-9)
   - 22×22 = 484 floats per linear instruction
   - Indexed by: `matrix_offset = u32(state.IP) * 484`
   - Used by linear kernel for matrix-vector multiplication

### Opcode Categories

| Range  | Category              | Execution Kernel | Matrix? | Divergence |
|--------|-----------------------|------------------|---------|------------|
| 0-9    | Linear Operations     | Linear           | Yes     | None       |
| 10-19  | Oracle Operations     | Oracle           | No      | Minimal    |
| 20-29  | I/O Operations        | I/O              | No      | Some       |
| 30-49  | Reserved (I/O ext)    | I/O              | No      | Some       |
| 50-69  | Branch Operations     | Branch           | No      | Expected   |
| 70-99  | Reserved (future)     | -                | -       | -          |

### Complete Instruction Set

#### Linear Operations (0-9)

Pure linear transformations compiled to 22×22 matrices:

| Opcode | Mnemonic | Operands | Description | Matrix Effect |
|--------|----------|----------|-------------|---------------|
| 0 | `ADD r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 + r_s2` | Row[rd]: copy rs1 + copy rs2 |
| 1 | `SUB r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 - r_s2` | Row[rd]: copy rs1 - copy rs2 |
| 2 | `MOV r_d, r_s` | dest, src, -, - | `r_d = r_s` | Row[rd]: copy rs |
| 3 | `SETI r_d, imm` | dest, immediate, -, - | `r_d = imm` | Row[rd]: imm from homogeneous |
| 4 | `LOAD r_d, addr` | dest, address, -, - | `r_d = mem[addr]` | Row[rd]: copy mem[addr] |
| 5 | `STORE r_s, addr` | src, address, -, - | `mem[addr] = r_s` | Row[mem+addr]: copy rs |
| 6 | `COPY mem_d, mem_s` | dest_addr, src_addr, -, - | `mem[d] = mem[s]` | Row[mem+d]: copy mem[s] |
| 7 | `CLEAR r_d` | dest, -, -, - | `r_d = 0` | Row[rd]: zero all |
| 8 | `NEG r_d, r_s` | dest, src, -, - | `r_d = -r_s` | Row[rd]: -1 * rs |
| 9 | `SCALE r_d, r_s, f` | dest, src, factor, - | `r_d = r_s * f` | Row[rd]: factor * rs |

**Note**: All linear operations automatically increment IP by 1 in their matrix (row 0 has coefficient 1 for homogeneous coordinate).

**Address Constraint**: LOAD, STORE, COPY use compile-time constant addresses only. This enables linear transformations. Dynamic addressing requires syscalls to shared memory.

#### Oracle Operations (10-19)

Non-linear arithmetic requiring exact computation:

| Opcode | Mnemonic | Operands | Description |
|--------|----------|----------|-------------|
| 10 | `MUL r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 * r_s2` |
| 11 | `DIV r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 / r_s2` |
| 12 | `MOD r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 % r_s2` |
| 13 | `CMP r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 - r_s2` (sets condition) |
| 14 | `MIN r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = min(r_s1, r_s2)` |
| 15 | `MAX r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = max(r_s1, r_s2)` |
| 16 | `ABS r_d, r_s` | dest, src, -, - | `r_d = abs(r_s)` |
| 17 | `SQRT r_d, r_s` | dest, src, -, - | `r_d = sqrt(r_s)` |
| 18 | `SIN r_d, r_s` | dest, src, -, - | `r_d = sin(r_s)` |
| 19 | `COS r_d, r_s` | dest, src, -, - | `r_d = cos(r_s)` |

**Note**: All oracle operations increment IP by 1 (handled in oracle kernel, not via matrix).

#### Oracle Operations with Immediate (20-29)

For operations with one compile-time constant operand:

| Opcode | Mnemonic | Operands | Description |
|--------|----------|----------|-------------|
| 20 | `MULI r_d, r_s, imm` | dest, src, immediate, - | `r_d = r_s * imm` |
| 21 | `DIVI r_d, r_s, imm` | dest, src, immediate, - | `r_d = r_s / imm` |
| 22 | `MODI r_d, r_s, imm` | dest, src, immediate, - | `r_d = r_s % imm` |
| 23 | `CMPI r_d, r_s, imm` | dest, src, immediate, - | `r_d = r_s - imm` |

**Rationale**: Common pattern where one operand is constant (e.g., normalizing by known value). More efficient than SETI + MUL.

#### I/O Operations (30-49)

System calls for external memory access and VM control:

| Opcode | Mnemonic | Operands | Description |
|--------|----------|----------|-------------|
| 30 | `SYSCALL_READ r_d, r_a` | dest, addr_reg, -, - | `r_d = shared_memory[r_a]` |
| 31 | `SYSCALL_WRITE r_a, r_s` | addr_reg, src, -, - | `shared_memory[r_a] = r_s` |
| 32 | `SYSCALL_VMID r_d` | dest, -, -, - | `r_d = f32(vm_id)` |
| 33 | `SYSCALL_YIELD` | -, -, -, - | Suspend execution, reschedule later |
| 34 | `SYSCALL_HALT` | -, -, -, - | Stop execution permanently |

**Note**: Addresses in SYSCALL_READ/WRITE are **runtime values in registers**, not compile-time constants. This enables dynamic addressing via shared memory.

#### Branch Operations (50-69)

Control flow resolution:

| Opcode | Mnemonic | Operands | Description |
|--------|----------|----------|-------------|
| 50 | `BRANCH_EQ r_c, tgt` | cond_reg, target_ip, -, - | Jump if `r_c == 0` |
| 51 | `BRANCH_NE r_c, tgt` | cond_reg, target_ip, -, - | Jump if `r_c != 0` |
| 52 | `BRANCH_LT r_c, tgt` | cond_reg, target_ip, -, - | Jump if `r_c < 0` |
| 53 | `BRANCH_GT r_c, tgt` | cond_reg, target_ip, -, - | Jump if `r_c > 0` |
| 54 | `BRANCH_LE r_c, tgt` | cond_reg, target_ip, -, - | Jump if `r_c <= 0` |
| 55 | `BRANCH_GE r_c, tgt` | cond_reg, target_ip, -, - | Jump if `r_c >= 0` |
| 56 | `JUMP tgt` | target_ip, -, -, - | Unconditional jump |
| 60 | `CALL tgt` | target_ip, -, -, - | Jump to target, save return address |
| 61 | `RETURN` | -, -, -, - | Return from function call |

**Branch Evaluation**: Uses epsilon comparison for equality (|value| < 0.0001 = zero).

---

## Memory Architecture

### Three-Tier Memory Model

The system uses three distinct memory spaces, each with different addressing modes and use cases:

#### 1. VM Memory (Part of State Vector)

**Characteristics**:
- **Size**: 16 floats (64 bytes) per VM
- **Addressing**: Compile-time constants only
- **Access**: Via LOAD/STORE instructions (linear operations)
- **Scope**: Private to each VM instance
- **Performance**: Fastest (part of transformed state)

**Use Cases**:
- Loop counters and indices
- Temporary computation values
- Function local variables
- Small constant data

**Example**:
```assembly
SETI r0, 5           # r0 = 5
STORE r0, 3          # mem[3] = 5 (compile-time address)
LOAD r1, 3           # r1 = mem[3]
ADD r2, r0, r1       # r2 = 10
```

**Why Compile-Time Addresses?**: This restriction enables linear transformations. LOAD with address 3 becomes a matrix that copies `mem[3]` to a register. Dynamic addressing (e.g., `LOAD r0, [r1]`) would require non-linear array indexing operations.

#### 2. Shared Memory (External Buffer)

**Characteristics**:
- **Size**: Configurable (typically MB-GB range)
- **Addressing**: Runtime values in registers
- **Access**: Via SYSCALL_READ/SYSCALL_WRITE (I/O operations)
- **Scope**: Shared across all VMs
- **Performance**: Slower (requires syscall overhead)

**Use Cases**:
- Input/output data for routines
- Inter-VM communication
- Large datasets that don't fit in VM memory
- Dynamic data structures

**Example**:
```assembly
SYSCALL_VMID r0      # r0 = my VM ID (e.g., 42)
MULI r0, r0, 4       # r0 = 168 (offset for my data)
SYSCALL_READ r1, r0  # r1 = shared_memory[168]
ADD r1, r1, 10       # Process data
SYSCALL_WRITE r0, r1 # shared_memory[168] = result
```

**Communication Pattern**: VMs use their ID to compute unique offsets, enabling parallel access without conflicts.

#### 3. Call Stack (External Buffer)

**Characteristics**:
- **Size**: Dynamic, one frame per active function call
- **Addressing**: Via stack_pointer metadata
- **Access**: Implicitly by CALL/RETURN (branch operations)
- **Scope**: Per-VM, but stored in shared structure
- **Performance**: Moderate (only accessed on CALL/RETURN)

**Use Cases**:
- Function return addresses
- Saved register state (calling convention)
- Function call depth tracking

**Structure**:
```wgsl
struct CallFrame {
  vm_id: u32,
  return_ip: u32,
  saved_registers: array<f32, 4>,  // Optional: depends on calling convention
}

@group(0) @binding(X) var<storage, read_write> call_stack: array<CallFrame>;
@group(0) @binding(Y) var<storage, read_write> call_stack_top: atomic<u32>;
```

### Complete Memory Layout (GPU)

```
┌────────────────────────────────────────┐
│  Instruction Metadata (Read-Only)     │
│  - program: array<Instruction>         │
│  - Size: 20 bytes × num_instructions   │
│  - Contains: opcode + operands         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Transformation Matrices (Read-Only)   │
│  - matrices: array<f32>                │
│  - Size: 484 floats × num_linear_inst  │
│  - Contains: 22×22 matrices            │
│  - Texture memory for fast access      │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  VM States (Read-Write)                │
│  - vm_states: array<VMState>           │
│  - Size: 128 bytes × num_vms           │
│  - Contains: IP, registers, memory,    │
│              vm_id, stack_ptr, status  │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Call Stack (Read-Write)               │
│  - call_stack: array<CallFrame>        │
│  - Size: 32 bytes × max_active_calls   │
│  - Dynamic allocation via atomic       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Shared Memory (Read-Write)            │
│  - shared_memory: array<f32>           │
│  - Size: Configurable (1MB - 1GB)      │
│  - Contains: Input/output data,        │
│              inter-routine buffers     │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Classification Buffers (Read-Write)   │
│  - linear_indices: array<u32>          │
│  - oracle_indices: array<u32>          │
│  - branch_indices: array<u32>          │
│  - io_indices: array<u32>              │
│  - classification: Classification      │
│  - Size: 4 bytes × num_vms × 4 + 16    │
│  - Temporary, reset each epoch         │
└────────────────────────────────────────┘
```

---

## Kernel Architecture

### Five-Kernel Design

The system uses five specialized GPU kernels to eliminate thread divergence and maximize parallelism. Each kernel processes only VMs executing its instruction type, ensuring coherent execution.

### Kernel Execution Flow

```
For each epoch:
  1. Classification Kernel: Sort all VMs by instruction type
     Output: Four index arrays (linear, oracle, branch, io)
  
  2. Execution Kernels (in parallel if resources allow):
     - Linear Kernel:  Process VMs with linear operations
     - Oracle Kernel:  Process VMs with oracle operations
     - Branch Kernel:  Process VMs with branch operations
     - I/O Kernel:     Process VMs with I/O operations
  
  3. Repeat until all VMs in current phase have halted
```

### 1. Classification Kernel

**Purpose**: Categorize all VMs by their current instruction type.

**Execution**: Once per epoch, processes all active VMs.

**Performance**: ~0.01ms for 1000 VMs (trivial per-VM work, atomic operations).

```wgsl
@group(0) @binding(0) var<storage, read> vm_states: array<VMState>;
@group(0) @binding(1) var<storage, read> program: array<Instruction>;
@group(0) @binding(2) var<storage, read_write> classification: Classification;
@group(0) @binding(3) var<storage, read_write> linear_indices: array<u32>;
@group(0) @binding(4) var<storage, read_write> oracle_indices: array<u32>;
@group(0) @binding(5) var<storage, read_write> branch_indices: array<u32>;
@group(0) @binding(6) var<storage, read_write> io_indices: array<u32>;

struct Classification {
  linear_count: atomic<u32>,
  oracle_count: atomic<u32>,
  branch_count: atomic<u32>,
  io_count: atomic<u32>,
}

@compute @workgroup_size(256)
fn classify_instructions(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let vm_id = global_id.x;
  if (vm_id >= arrayLength(&vm_states)) { return; }
  
  let state = vm_states[vm_id];
  
  // Skip inactive VMs
  if (state.status != STATUS_RUNNING) { return; }
  
  let ip = u32(state.IP);
  let inst = program[ip];
  
  // Route to appropriate kernel based on opcode range
  if (inst.opcode < 10u) {  // Linear operations
    let idx = atomicAdd(&classification.linear_count, 1u);
    linear_indices[idx] = vm_id;
  } else if (inst.opcode < 30u) {  // Oracle operations
    let idx = atomicAdd(&classification.oracle_count, 1u);
    oracle_indices[idx] = vm_id;
  } else if (inst.opcode < 50u) {  // I/O operations
    let idx = atomicAdd(&classification.io_count, 1u);
    io_indices[idx] = vm_id;
  } else if (inst.opcode < 70u) {  // Branch operations
    let idx = atomicAdd(&classification.branch_count, 1u);
    branch_indices[idx] = vm_id;
  }
}
```

**Output**: Four compact arrays of VM indices, one per kernel type. Only VMs with matching instruction types are included.

---

### 2. Linear Transformation Kernel

**Purpose**: Execute matrix-vector multiplication for all VMs performing linear operations.

**Key Feature**: Zero thread divergence - all threads execute identical matrix operations.

**Performance**: ~0.05ms for 600 VMs (matrix multiply is computationally intensive but highly parallel).

```wgsl
@compute @workgroup_size(256)
fn linear_step(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= classification.linear_count) { return; }
  
  let vm_id = linear_indices[idx];  // Only process classified linear VMs
  var state = vm_states[vm_id];
  let ip = u32(state.IP);
  
  // Fetch transformation matrix for this instruction
  let matrix_offset = ip * 484u;  // 22×22 = 484 floats
  
  // Pack state into vector
  var state_vec: array<f32, 22>;
  state_vec[0] = state.IP;
  for (var i = 0u; i < 4u; i++) {
    state_vec[i + 1u] = state.registers[i];
  }
  for (var i = 0u; i < 16u; i++) {
    state_vec[i + 5u] = state.memory[i];
  }
  state_vec[21] = 1.0;  // Homogeneous coordinate
  
  // Matrix-vector multiply: new_state = matrix * state_vec
  var new_state_vec: array<f32, 22>;
  for (var row = 0u; row < 22u; row++) {
    var sum = 0.0;
    for (var col = 0u; col < 22u; col++) {
      sum += matrices[matrix_offset + row * 22u + col] * state_vec[col];
    }
    new_state_vec[row] = sum;
  }
  
  // Unpack result back into state
  state.IP = new_state_vec[0];
  for (var i = 0u; i < 4u; i++) {
    state.registers[i] = new_state_vec[i + 1u];
  }
  for (var i = 0u; i < 16u; i++) {
    state.memory[i] = new_state_vec[i + 5u];
  }
  
  vm_states[vm_id] = state;
}
```

**Example Transformation Matrix**: For `ADD r2, r0, r1`:

```
        IP  r0  r1  r2  r3  mem0...mem15  1
    IP [ 1   0   0   0   0   0  ...  0    1 ]  ← IP += 1
    r0 [ 0   1   0   0   0   0  ...  0    0 ]  ← r0 unchanged
    r1 [ 0   0   1   0   0   0  ...  0    0 ]  ← r1 unchanged
    r2 [ 0   1   1   0   0   0  ...  0    0 ]  ← r2 = r0 + r1
    r3 [ 0   0   0   0   1   0  ...  0    0 ]  ← r3 unchanged
  mem0 [ 0   0   0   0   0   1  ...  0    0 ]  ← memory unchanged
   ... [ ... similar rows for mem1-mem15 ... ]
     1 [ 0   0   0   0   0   0  ...  0    1 ]  ← constant remains 1
```

---

### 3. Oracle Operations Kernel

**Purpose**: Handle non-linear arithmetic operations with exact computation.

**Divergence**: Minimal - only 20 opcodes create branches, grouped together by classification.

**Performance**: ~0.02ms for 300 VMs (simple arithmetic, some branch divergence).

```wgsl
@compute @workgroup_size(256)
fn oracle_step(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= classification.oracle_count) { return; }
  
  let vm_id = oracle_indices[idx];
  var state = vm_states[vm_id];
  let ip = u32(state.IP);
  let inst = program[ip];
  
  // Extract operands
  let dest = inst.operands[0];
  let src1 = inst.operands[1];
  let src2 = inst.operands[2];
  
  // Execute operation based on opcode
  switch (inst.opcode) {
    case 10u: {  // MUL
      state.registers[dest] = state.registers[src1] * state.registers[src2];
    }
    case 11u: {  // DIV
      state.registers[dest] = state.registers[src1] / state.registers[src2];
    }
    case 12u: {  // MOD
      state.registers[dest] = state.registers[src1] % state.registers[src2];
    }
    case 13u: {  // CMP
      state.registers[dest] = state.registers[src1] - state.registers[src2];
    }
    case 14u: {  // MIN
      state.registers[dest] = min(state.registers[src1], state.registers[src2]);
    }
    case 15u: {  // MAX
      state.registers[dest] = max(state.registers[src1], state.registers[src2]);
    }
    case 16u: {  // ABS
      state.registers[dest] = abs(state.registers[src1]);
    }
    case 17u: {  // SQRT
      state.registers[dest] = sqrt(state.registers[src1]);
    }
    case 18u: {  // SIN
      state.registers[dest] = sin(state.registers[src1]);
    }
    case 19u: {  // COS
      state.registers[dest] = cos(state.registers[src1]);
    }
    case 20u: {  // MULI (multiply immediate)
      let immediate = bitcast<f32>(inst.operands[2]);
      state.registers[dest] = state.registers[src1] * immediate;
    }
    case 21u: {  // DIVI (divide immediate)
      let immediate = bitcast<f32>(inst.operands[2]);
      state.registers[dest] = state.registers[src1] / immediate;
    }
    case 22u: {  // MODI (modulo immediate)
      let immediate = bitcast<f32>(inst.operands[2]);
      state.registers[dest] = state.registers[src1] % immediate;
    }
    case 23u: {  // CMPI (compare immediate)
      let immediate = bitcast<f32>(inst.operands[2]);
      state.registers[dest] = state.registers[src1] - immediate;
    }
    default: {}
  }
  
  state.IP += 1.0;  // Increment instruction pointer
  vm_states[vm_id] = state;
}
```

---

### 4. Branch Resolution Kernel

**Purpose**: Evaluate branch conditions and update instruction pointers.

**Key Insight**: Control flow is resolved by the scheduler, not encoded in matrices.

**Performance**: ~0.02ms for 100 VMs (minimal per-VM work, some divergence on CALL/RETURN).

```wgsl
@compute @workgroup_size(256)
fn resolve_branches(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= classification.branch_count) { return; }
  
  let vm_id = branch_indices[idx];
  var state = vm_states[vm_id];
  let ip = u32(state.IP);
  let inst = program[ip];
  
  var new_ip = ip + 1u;  // Default: fall through
  var should_branch = false;
  
  // Extract operands
  let condition_reg = inst.operands[0];
  let target_ip = inst.operands[1];
  let condition_value = state.registers[condition_reg];
  
  // Evaluate branch condition
  switch (inst.opcode) {
    case 50u: {  // BRANCH_EQ
      should_branch = (abs(condition_value) < 0.0001);
    }
    case 51u: {  // BRANCH_NE
      should_branch = (abs(condition_value) >= 0.0001);
    }
    case 52u: {  // BRANCH_LT
      should_branch = (condition_value < 0.0);
    }
    case 53u: {  // BRANCH_GT
      should_branch = (condition_value > 0.0);
    }
    case 54u: {  // BRANCH_LE
      should_branch = (condition_value <= 0.0);
    }
    case 55u: {  // BRANCH_GE
      should_branch = (condition_value >= 0.0);
    }
    case 56u: {  // JUMP (unconditional)
      should_branch = true;
    }
    case 60u: {  // CALL
      // Save return address to call stack
      let stack_idx = atomicAdd(&call_stack_top, 1u);
      call_stack[stack_idx].vm_id = vm_id;
      call_stack[stack_idx].return_ip = ip + 1u;
      
      // Save register state (calling convention)
      for (var i = 0u; i < 4u; i++) {
        call_stack[stack_idx].saved_registers[i] = state.registers[i];
      }
      
      state.stack_pointer = stack_idx;
      should_branch = true;
    }
    case 61u: {  // RETURN
      // Restore from call stack
      let stack_idx = state.stack_pointer;
      let frame = call_stack[stack_idx];
      
      new_ip = frame.return_ip;
      
      // Restore register state (calling convention)
      for (var i = 0u; i < 4u; i++) {
        state.registers[i] = frame.saved_registers[i];
      }
      
      // Mark frame as free
      call_stack[stack_idx].vm_id = 0xFFFFFFFFu;
      
      should_branch = false;  // new_ip already set
    }
    default: {}
  }
  
  if (should_branch) {
    new_ip = target_ip;
  }
  
  state.IP = f32(new_ip);
  vm_states[vm_id] = state;
}
```

---

### 5. I/O and Scheduling Kernel

**Purpose**: Manage system calls, inter-VM communication, and execution scheduling.

**Performance**: ~0.01ms for 100 VMs (memory operations may have higher latency).

```wgsl
@compute @workgroup_size(256)
fn io_scheduler(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= classification.io_count) { return; }
  
  let vm_id = io_indices[idx];
  var state = vm_states[vm_id];
  let ip = u32(state.IP);
  let inst = program[ip];
  
  // Extract operands
  let operand0 = inst.operands[0];
  let operand1 = inst.operands[1];
  
  switch (inst.opcode) {
    case 30u: {  // SYSCALL_READ
      // operand0 = destination register
      // operand1 = address register
      let addr = u32(state.registers[operand1]);
      state.registers[operand0] = shared_memory[addr];
      state.IP += 1.0;
    }
    case 31u: {  // SYSCALL_WRITE
      // operand0 = address register
      // operand1 = source register
      let addr = u32(state.registers[operand0]);
      shared_memory[addr] = state.registers[operand1];
      state.IP += 1.0;
    }
    case 32u: {  // SYSCALL_VMID
      // operand0 = destination register
      state.registers[operand0] = f32(state.vm_id);
      state.IP += 1.0;
    }
    case 33u: {  // SYSCALL_YIELD
      // Don't increment IP - will resume at same instruction
      state.status = STATUS_YIELDED;
    }
    case 34u: {  // SYSCALL_HALT
      state.status = STATUS_HALTED;
    }
    default: {}
  }
  
  vm_states[vm_id] = state;
}
```

---

## Compilation Model

### High-Level Language to VM Program

The compilation process transforms high-level expressions and statements into VM instruction sequences (routines) with static scheduling information.

### Compilation Pipeline

```
┌─────────────────────────────────────┐
│  1. PARSING & AST CONSTRUCTION      │
│     - Parse high-level code         │
│     - Build abstract syntax tree    │
│     - Type checking                 │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  2. DATAFLOW ANALYSIS               │
│     - Build dependency graph        │
│     - Identify expression boundaries│
│     - Detect parallelism            │
│     - Communication pattern analysis│
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  3. OPTIMIZATION PASSES             │
│     - Operation fusion              │
│     - Partial evaluation            │
│     - Constant propagation          │
│     - Dead code elimination         │
│     - Lifetime analysis             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  4. PHASE GENERATION                │
│     - Topological sort of dataflow  │
│     - Assign operations to phases   │
│     - Determine phase boundaries    │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  5. ROUTINE COMPILATION             │
│     - Generate VM instructions      │
│     - Allocate VM memory            │
│     - Generate transformation       │
│       matrices for linear ops       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  6. BUFFER ALLOCATION               │
│     - Analyze buffer lifetimes      │
│     - Allocate shared memory        │
│     - Generate buffer layout        │
│     - Optimize for reuse            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  7. VM ALLOCATION STRATEGY          │
│     - Determine VM counts           │
│     - SIMD vs MIMD decisions        │
│     - Resource balancing            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  8. EXECUTABLE GENERATION           │
│     - Package instructions          │
│     - Package matrices              │
│     - Package metadata              │
│     - Generate execution plan       │
└─────────────────────────────────────┘
```

### Expression Boundaries as Synchronization Points

**Key Insight**: Statement and expression boundaries provide natural synchronization points where the compiler can insert barriers.

```typescript
// High-level code with expression boundaries
let a = compute_expensive(x);  // Expression 1 | Barrier
let b = compute_expensive(y);  // Expression 2 | Barrier
let c = a + b;                 // Expression 3 | Barrier

// Compiler analysis:
class ExpressionAnalyzer {
  analyzeDependencies(statements: Statement[]): DependencyGraph {
    const graph = new DependencyGraph();
    
    for (const stmt of statements) {
      const reads = this.extractReads(stmt);   // What does it read?
      const writes = this.extractWrites(stmt); // What does it write?
      
      graph.addNode(stmt, { reads, writes });
      
      // Add edges for data dependencies
      for (const read of reads) {
        const producer = graph.findProducer(read);
        if (producer) {
          graph.addEdge(producer, stmt);  // stmt depends on producer
        }
      }
    }
    
    return graph;
  }
}

// Result: Dependency graph
// a = compute_expensive(x)  [Level 0, no dependencies]
// b = compute_expensive(y)  [Level 0, no dependencies]
// c = a + b                 [Level 1, depends on a and b]

// Generated phases:
Phase 1: [compute_expensive(x), compute_expensive(y)]  // Parallel!
Phase 2: [a + b]                                       // Sequential dependency
```

### Static Communication Patterns

The compiler has complete visibility into which routines communicate:

```typescript
// High-level code
function pipeline() {
  let stage1_result = stage1_compute();  // Produces data
  let stage2_result = stage2_compute(stage1_result);  // Consumes stage1
  let stage3_result = stage3_compute(stage2_result);  // Consumes stage2
  return stage3_result;
}

// Compiler generates memory layout:
class BufferAllocator {
  allocateBuffers(pipeline: Pipeline): BufferLayout {
    return {
      stage1_output: { 
        addr: 0, 
        size: 1000,
        lifetime: [phase1_start, phase2_end]  // Written in phase1, read in phase2
      },
      stage2_output: { 
        addr: 1000, 
        size: 1000,
        lifetime: [phase2_start, phase3_end]  // Written in phase2, read in phase3
      },
      stage3_output: { 
        addr: 2000, 
        size: 1000,
        lifetime: [phase3_start, program_end]  // Final output
      },
    };
  }
}

// Generated routines have buffer locations baked in:
Routine stage1_compute:
  SYSCALL_VMID r0
  # ... compute ...
  SETI r1, 0          # Output buffer starts at address 0
  ADD r1, r1, r0      # Offset by vm_id
  SYSCALL_WRITE r1, r2  # Write to shared_memory[vm_id]
  HALT

Routine stage2_compute:
  SYSCALL_VMID r0
  SETI r1, 0          # Input buffer starts at address 0
  ADD r1, r1, r0      # Offset by vm_id
  SYSCALL_READ r2, r1   # Read from shared_memory[vm_id]
  # ... compute ...
  SETI r1, 1000       # Output buffer starts at address 1000
  ADD r1, r1, r0      # Offset by vm_id
  SYSCALL_WRITE r1, r3  # Write to shared_memory[1000 + vm_id]
  HALT
```

### Dataflow Graph and Phase Generation

```typescript
// Complex example with multiple dependencies
function complexProcessing(input) {
  let a = processA(input);     // Level 0
  let b = processB(input);     // Level 0 (parallel with a)
  let c = processC(a);         // Level 1 (depends on a)
  let d = processD(a, b);      // Level 1 (depends on a and b)
  let e = processE(c, d);      // Level 2 (depends on c and d)
  return e;
}

// Compiler builds dataflow graph:
class DataflowCompiler {
  compile(func: Function): ExecutionPlan {
    // 1. Build dependency graph
    const graph = this.buildGraph(func);
    // Nodes: processA, processB, processC, processD, processE
    // Edges: input→a, input→b, a→c, a→d, b→d, c→e, d→e
    
    // 2. Topological sort to find execution levels
    const levels = this.topologicalLevels(graph);
    // Level 0: [processA, processB]
    // Level 1: [processC, processD]
    // Level 2: [processE]
    
    // 3. Generate phases
    const plan = new ExecutionPlan();
    
    for (let i = 0; i < levels.length; i++) {
      const routines = levels[i].map(node => ({
        routine: this.compileToRoutine(node),
        vmCount: this.estimateVMCount(node),
        inputBuffers: this.allocateInputs(node),
        outputBuffers: this.allocateOutputs(node),
      }));
      
      plan.addPhase({
        level: i,
        routines: routines,
        barrier: 'wait_all',  // Synchronization type
      });
    }
    
    return plan;
  }
  
  topologicalLevels(graph: DataflowGraph): Node[][] {
    const levels: Node[][] = [];
    const visited = new Set<Node>();
    
    const getLevel = (node: Node): number => {
      if (visited.has(node)) return node.level;
      
      const deps = graph.getDependencies(node);
      if (deps.length === 0) {
        node.level = 0;  // No dependencies = level 0
      } else {
        // Level = 1 + max(dependency levels)
        node.level = 1 + Math.max(...deps.map(d => getLevel(d)));
      }
      
      visited.add(node);
      return node.level;
    };
    
    // Compute levels for all nodes
    for (const node of graph.nodes) {
      const level = getLevel(node);
      if (!levels[level]) levels[level] = [];
      levels[level].push(node);
    }
    
    return levels;
  }
}

// Generated execution plan:
ExecutionPlan {
  phases: [
    {
      level: 0,
      routines: [
        { name: 'processA', entry_ip: 0, vm_count: 1000, input: [0..999], output: [1000..1999] },
        { name: 'processB', entry_ip: 20, vm_count: 1000, input: [0..999], output: [2000..2999] }
      ],
      barrier: 'wait_all'
    },
    {
      level: 1,
      routines: [
        { name: 'processC', entry_ip: 40, vm_count: 1000, input: [1000..1999], output: [3000..3999] },
        { name: 'processD', entry_ip: 60, vm_count: 1000, input: [1000..2999], output: [4000..4999] }
      ],
      barrier: 'wait_all'
    },
    {
      level: 2,
      routines: [
        { name: 'processE', entry_ip: 80, vm_count: 1000, input: [3000..4999], output: [5000..5999] }
      ],
      barrier: 'wait_all'
    }
  ]
}
```

### Executable Format

The compiled output packages everything needed for execution:

```typescript
interface VMExecutable {
  // Metadata
  metadata: {
    version: string;
    totalInstructions: number;
    linearInstructionCount: number;
    routineCount: number;
    phaseCount: number;
    estimatedEpochs: number;
    resourceRequirements: {
      maxVMs: number;
      sharedMemoryBytes: number;
      callStackDepth: number;
    };
  };
  
  // Instructions
  instructions: Instruction[];  // All instructions for all routines
  
  // Matrices (only for linear operations)
  matrices: Float32Array;  // 484 floats per linear instruction
  
  // Routines
  routines: RoutineInfo[];
  
  // Execution plan
  executionPlan: ExecutionPlan;
  
  // Buffer layout
  bufferLayout: BufferLayout;
}

interface RoutineInfo {
  name: string;
  entryPoint: number;  // IP address where routine starts
  instructionCount: number;
  estimatedEpochs: number;
  memoryUsage: {
    vmMemorySlots: number[];  // Which VM memory slots are used
    sharedMemoryRegions: MemoryRegion[];
  };
}

interface ExecutionPlan {
  phases: Phase[];
}

interface Phase {
  level: number;  // Dependency level (from topological sort)
  routines: PhaseRoutine[];
  barrierType: 'wait_all' | 'wait_any' | 'none';
}

interface PhaseRoutine {
  routineIndex: number;  // Index into routines[] array
  vmCount: number;  // How many VMs to launch
  vmAllocationStrategy: 'contiguous' | 'strided' | 'custom';
  inputBuffers: BufferRegion[];
  outputBuffers: BufferRegion[];
}

interface BufferLayout {
  regions: BufferRegion[];
  totalSize: number;
  reusedRegions: [number, number][];  // Pairs of regions that reuse same memory
}

interface BufferRegion {
  name: string;
  offset: number;
  size: number;
  lifetime: [number, number];  // [first_use_phase, last_use_phase]
  reuseOf?: number;  // Index of region this reuses memory from
}
```

---

## Execution Model

### Phase-Based Execution

The runtime executes programs in discrete phases, where each phase contains one or more routines that can run concurrently.

```typescript
enum VMStatus {
  RUNNING = 0,
  BLOCKED = 1,
  YIELDED = 2,
  HALTED = 3,
}

class GPUVMRuntime {
  async executeProgram(executable: VMExecutable): Promise<void> {
    // Initialize GPU buffers
    await this.initializeBuffers(executable);
    
    // Execute each phase sequentially
    for (const phase of executable.executionPlan.phases) {
      await this.executePhase(phase);
      
      // Barrier: Wait for all VMs in phase to complete
      await this.waitForPhaseCompletion(phase);
    }
    
    // Read final results
    return await this.readResults(executable.bufferLayout.outputRegion);
  }
  
  async executePhase(phase: Phase): Promise<void> {
    // Launch VMs for all routines in this phase
    const vmBatches: VMBatch[] = [];
    
    for (const phaseRoutine of phase.routines) {
      const routine = this.executable.routines[phaseRoutine.routineIndex];
      
      // Initialize VM states for this routine
      const vmBatch = await this.launchVMs({
        count: phaseRoutine.vmCount,
        entryPoint: routine.entryPoint,
        inputBuffers: phaseRoutine.inputBuffers,
        outputBuffers: phaseRoutine.outputBuffers,
      });
      
      vmBatches.push(vmBatch);
    }
    
    // Execute epochs until all VMs in phase halt
    while (this.hasActiveVMs(vmBatches)) {
      await this.executeEpoch();
      await this.updateVMStatuses();
    }
  }
  
  async executeEpoch(): Promise<void> {
    // 1. Classification: Sort VMs by instruction type
    await this.dispatchClassificationKernel();
    
    // 2. Read classification results (small GPU→CPU transfer)
    const counts = await this.readClassificationCounts();
    
    // 3. Dispatch execution kernels (only for non-empty groups)
    const kernelPromises: Promise<void>[] = [];
    
    if (counts.linear > 0) {
      kernelPromises.push(
        this.dispatchLinearKernel(counts.linear)
      );
    }
    
    if (counts.oracle > 0) {
      kernelPromises.push(
        this.dispatchOracleKernel(counts.oracle)
      );
    }
    
    if (counts.branch > 0) {
      kernelPromises.push(
        this.dispatchBranchKernel(counts.branch)
      );
    }
    
    if (counts.io > 0) {
      kernelPromises.push(
        this.dispatchIOKernel(counts.io)
      );
    }
    
    // 4. Wait for all kernels to complete
    await Promise.all(kernelPromises);
  }
}
```

### Epoch-Level Execution Within Phases

```
Phase 1: "Process A and B in parallel"
  
  Initial State:
    VMs 0-499:   IP = 0  (processA routine entry)
    VMs 500-999: IP = 20 (processB routine entry)
  
  Epoch 1:
    Classification:
      - All 1000 VMs classified by instruction at their IP
      - VMs 0-499 at IP=0: SYSCALL_VMID → io_indices
      - VMs 500-999 at IP=20: SYSCALL_VMID → io_indices
      - Result: 1000 VMs in io_indices
    
    Execution:
      - I/O Kernel processes all 1000 VMs
      - Each VM: r0 = vm_id
      - All VMs: IP += 1
  
  Epoch 2:
    Classification:
      - VMs 0-499 at IP=1: MUL → oracle_indices
      - VMs 500-999 at IP=21: ADD → linear_indices
      - Result: 500 in oracle_indices, 500 in linear_indices
    
    Execution:
      - Oracle Kernel processes VMs 0-499 (MUL)
      - Linear Kernel processes VMs 500-999 (ADD)
      - Both kernels run concurrently
      - All VMs: IP += 1
  
  Epoch 3-N:
    ... continues ...
  
  Epoch N:
    Classification:
      - All VMs at HALT instruction
      - All VMs marked STATUS_HALTED
    
    Phase 1 Complete
    
  [Barrier: Wait for all VMs to halt]

Phase 2: "Process C"
  
  Initial State:
    VMs 0-999: IP = 40 (processC routine entry)
    VMs 0-999: status = RUNNING
  
  Epoch 1:
    ... (similar pattern) ...
```

### VM Divergence Handling

When VMs take different paths (branches, different routines), they naturally separate:

```
Scenario: 1000 VMs executing a loop with data-dependent exit

Initial: All 1000 VMs at BRANCH_GT instruction

Epoch N: Branch Resolution
  - 600 VMs: condition true → IP = loop_start (backward jump)
  - 400 VMs: condition false → IP = next_instruction (fall through)

Epoch N+1: Classification
  - 600 VMs at loop_start classified together
  - 400 VMs at next_instruction classified together
  - No divergence within each group!

Epoch N+2:
  - 600 VMs continue loop body
  - 400 VMs execute post-loop code
  - Both groups may use different kernels (different instructions)

Epoch N+M:
  - Maybe 300 VMs still in loop
  - 700 VMs past loop
  - Groups continue to shrink as VMs exit loop

Eventually:
  - All VMs converge or halt
  - Phase completes when last VM halts
```

**Key Point**: Thread divergence is eliminated because VMs executing different instructions are processed in separate kernel invocations (via classification).

---

## Control Flow

### Loops

Loops are implemented as backward jumps. VMs continue executing until the loop condition becomes false.

**Example: Counting Loop**

```assembly
# Count from 0 to 9
SETI r0, 0          # r0 = counter (address 0)
SETI r1, 10         # r1 = limit

LOOP_START:         # Address 2
  LOAD r2, 5        # Some work: load from memory
  ADD r2, r2, r0    # Add counter
  STORE r2, 5       # Store back
  
  SETI r3, 1        # Increment value
  ADD r0, r0, r3    # counter++
  SUB r3, r1, r0    # r3 = limit - counter
  BRANCH_GT r3, 2   # if r3 > 0, goto LOOP_START (address 2)
  
HALT                # Address 9
```

**Execution Pattern**:
```
Epoch 1-2: All VMs execute addresses 0-1 (initialization)
           State: r0=0, r1=10, IP=2

Epoch 3-8: All VMs execute loop body (addresses 2-7)
           State: r0=1, IP=8

Epoch 9:   All VMs execute BRANCH_GT (address 8)
           600 VMs: r3 > 0 → IP = 2 (back to loop start)
           400 VMs: r3 <= 0 → IP = 9 (fall through to HALT)

Epoch 10:  600 VMs execute loop body again (addresses 2-7)
           400 VMs execute HALT (address 9, marked STATUS_HALTED)

Epoch 11-N: Progressively fewer VMs remain in loop
            Eventually all VMs halt
```

### Nested Loops

```assembly
# Nested loop: outer 0-4, inner 0-2
SETI r0, 0          # i = 0 (outer counter)
SETI r1, 5          # outer_limit

OUTER_LOOP:         # Address 2
  SETI r2, 0        # j = 0 (inner counter)
  SETI r3, 3        # inner_limit
  
  INNER_LOOP:       # Address 4
    MUL r4, r0, r2  # Work: r4 = i * j
    STORE r4, 10    # Store result
    
    SETI r5, 1
    ADD r2, r2, r5  # j++
    SUB r4, r3, r2  # temp = inner_limit - j
    BRANCH_GT r4, 4 # if temp > 0, goto INNER_LOOP
  
  SETI r5, 1
  ADD r0, r0, r5    # i++
  SUB r4, r1, r0    # temp = outer_limit - i
  BRANCH_GT r4, 2   # if temp > 0, goto OUTER_LOOP

HALT
```

### Function Calls

Functions use a global call stack managed by the branch kernel.

**Example: Function Call**

```assembly
# Main routine
SETI r0, 5          # First argument
SETI r1, 7          # Second argument
CALL 10             # Call multiply_function at address 10
STORE r0, 15        # Store result (r0 contains return value)
HALT

# Padding to address 10
# ...

# multiply_function at address 10
MULTIPLY_FUNC:
  MUL r0, r0, r1    # r0 = r0 * r1 (result in r0)
  RETURN            # Return to caller
```

**Execution Trace**:

```
Epoch 1-2: VMs execute SETI (addresses 0-1)
           State: r0=5, r1=7, IP=2

Epoch 3:   VMs execute CALL (address 2)
           Branch kernel:
             - Allocate stack frame
             - Save: vm_id, return_ip=3, saved_registers=[5,7,0,0]
             - Set: stack_pointer=stack_idx, IP=10

Epoch 4:   VMs execute MUL (address 10)
           Oracle kernel:
             - r0 = r0 * r1 = 35
             - IP = 11

Epoch 5:   VMs execute RETURN (address 11)
           Branch kernel:
             - Read stack frame
             - Restore: IP=3, registers=[5,7,0,0] (optional, depends on convention)
             - Note: r0=35 preserved (return value)
             - Free stack frame

Epoch 6:   VMs execute STORE (address 3)
           Linear kernel:
             - mem[15] = r0 = 35
             - IP = 4

Epoch 7:   VMs execute HALT (address 4)
           I/O kernel:
             - status = STATUS_HALTED
```

### Calling Conventions

**Three options for register preservation**:

#### 1. Caller-Save (Minimal Overhead)
- CALL: Don't save registers
- RETURN: Don't restore registers
- Caller responsible for saving important values to VM memory before CALL
- Callee can freely modify all registers
- Return value passed in r0

#### 2. Callee-Save (Maximum Safety)
- CALL: Save all 4 registers to stack
- RETURN: Restore all 4 registers from stack
- Callee modifications don't affect caller
- More expensive (4 memory operations per call)
- Return value passed in r0

#### 3. Hybrid (Recommended)
- CALL: Save r0-r1 only (argument/return registers)
- RETURN: Restore r0-r1, but r0 contains return value
- Callee can freely modify r2-r3 (scratch registers)
- Balanced performance and safety
- Typical usage:
  - r0: First argument / return value
  - r1: Second argument
  - r2-r3: Scratch space (caller must save if needed)

---

## Compiler Optimizations

### 1. Operation Fusion

**Goal**: Combine multiple high-level operations into a single routine, eliminating intermediate memory operations.

**Example**:

```typescript
// High-level code: Chain of map operations
let result = data
  .map(x => x * 2)
  .map(x => x + 1)
  .map(x => x / 3);

// WITHOUT FUSION: 3 routines, 3 phases
Routine map1:
  SYSCALL_VMID r0
  # Compute offset...
  SYSCALL_READ r1, r0      # Read input
  MULI r1, r1, 2           # x * 2
  SYSCALL_WRITE r0, r1     # Write to temp buffer 1
  HALT

Routine map2:
  SYSCALL_VMID r0
  # Compute offset...
  SYSCALL_READ r1, r0      # Read from temp buffer 1
  SETI r2, 1
  ADD r1, r1, r2           # x + 1
  SYSCALL_WRITE r0, r1     # Write to temp buffer 2
  HALT

Routine map3:
  SYSCALL_VMID r0
  # Compute offset...
  SYSCALL_READ r1, r0      # Read from temp buffer 2
  DIVI r1, r1, 3           # x / 3
  SYSCALL_WRITE r0, r1     # Write to output
  HALT

# Total: 3 phases × (read + compute + write) = 9 memory operations

// WITH FUSION: 1 routine, 1 phase
Routine map_fused:
  SYSCALL_VMID r0
  # Compute offset...
  SYSCALL_READ r1, r0      # Read input (once)
  MULI r1, r1, 2           # x * 2
  SETI r2, 1
  ADD r1, r1, r2           # + 1
  DIVI r1, r1, 3           # / 3
  SYSCALL_WRITE r0, r1     # Write output (once)
  HALT

# Total: 1 phase × (read + compute + write) = 2 memory operations

# Benefits:
# - 3x fewer phases (3 → 1)
# - 4.5x fewer memory operations (9 → 2)
# - 67% fewer epochs (assuming 5 instructions per routine: 15 → 5)
```

**Fusion Conditions**:
```typescript
class OperationFuser {
  canFuse(operations: Operation[]): boolean {
    return operations.every(op => 
      // 1. Operations are sequential (no branches between)
      op.isSequential() &&
      
      // 2. Intermediate results not used elsewhere
      !op.intermediateValueEscapes() &&
      
      // 3. Combined operations fit in registers
      this.fitsInRegisters(operations) &&
      
      // 4. No side effects that require intermediate persistence
      !op.hasSideEffects()
    );
  }
  
  fitsInRegisters(operations: Operation[]): boolean {
    // Can we perform all operations using only 4 registers
    // without spilling to memory?
    const analysis = this.performRegisterAllocation(operations);
    return analysis.maxRegistersNeeded <= 4;
  }
}
```

### 2. Partial Evaluation / Specialization

**Goal**: Bake compile-time constants into routines, eliminating runtime parameter loads.

**Example**:

```typescript
// High-level code with configuration parameters
function process(data: number[], threshold: number, scale: number) {
  return data.map(x => {
    if (x > threshold) {
      return x * scale;
    } else {
      return x;
    }
  });
}

// Call site with known constants
let result = process(data, 100, 2.0);

// GENERIC COMPILATION (no specialization):
Routine process_generic:
  SYSCALL_VMID r0
  # Load parameters from shared memory
  SETI r1, 10000              # Parameter buffer offset
  SYSCALL_READ r2, r1         # r2 = threshold (100)
  SETI r1, 10001
  SYSCALL_READ r3, r1         # r3 = scale (2.0)
  
  # Read input
  SYSCALL_VMID r0
  # ... offset computation ...
  SYSCALL_READ r1, r0         # r1 = x
  
  # Compare with threshold
  SUB r4, r1, r2              # r4 = x - threshold
  BRANCH_GT r4, SCALE_BRANCH
  
  # x <= threshold: return x unchanged
  MOV r1, r1                  # Result = x
  JUMP WRITE_RESULT
  
SCALE_BRANCH:
  # x > threshold: return x * scale
  MUL r1, r1, r3              # Result = x * scale
  
WRITE_RESULT:
  SYSCALL_VMID r0
  # ... offset computation ...
  SYSCALL_WRITE r0, r1
  HALT

# Total: 2 parameter loads, 1 data load, 1 write = 4 memory ops


// SPECIALIZED COMPILATION (constants baked in):
Routine process_specialized_100_2:
  SYSCALL_VMID r0
  
  # Read input
  # ... offset computation ...
  SYSCALL_READ r1, r0         # r1 = x
  
  # Compare with threshold (immediate value)
  CMPI r4, r1, 100            # r4 = x - 100 (threshold baked in)
  BRANCH_GT r4, SCALE_BRANCH
  
  # x <= threshold: return x unchanged
  MOV r1, r1
  JUMP WRITE_RESULT
  
SCALE_BRANCH:
  # x > threshold: return x * scale (immediate value)
  MULI r1, r1, 2              # Result = x * 2.0 (scale baked in)
  
WRITE_RESULT:
  SYSCALL_VMID r0
  # ... offset computation ...
  SYSCALL_WRITE r0, r1
  HALT

# Total: 1 data load, 1 write = 2 memory ops

# Benefits:
# - 2 fewer memory operations per VM (4 → 2)
# - Smaller instruction count (enables more fusion)
# - Can generate multiple specialized versions for different constants
```

**Specialization Strategy**:
```typescript
class PartialEvaluator {
  specialize(func: Function, callSite: CallSite): Routine {
    const constants = this.extractConstants(callSite);
    
    // Generate specialized routine name
    const specializedName = `${func.name}_${this.hashConstants(constants)}`;
    
    // Check if we've already specialized for these constants
    if (this.cache.has(specializedName)) {
      return this.cache.get(specializedName);
    }
    
    // Generate new specialized routine
    const specialized = this.compile(func, {
      constantPropagation: true,
      constants: constants,
      optimize: true,
    });
    
    this.cache.set(specializedName, specialized);
    return specialized;
  }
}
```

### 3. Lifetime Analysis & Buffer Reuse

**Goal**: Minimize shared memory usage by reusing buffers whose lifetimes don't overlap.

**Example**:

```typescript
// High-level code
function pipeline(input: Data): Result {
  let temp1 = expensiveOp1(input);  // Used only by temp3
  let temp2 = expensiveOp2(input);  // Used only by result
  let temp3 = expensiveOp3(temp1);  // temp1 can be freed after this
  let result = combine(temp3, temp2);  // temp2, temp3 can be freed after this
  return result;
}

// Lifetime analysis:
class LifetimeAnalyzer {
  analyzeLifetimes(pipeline: Pipeline): BufferLifetimes {
    return {
      input: { 
        born: 0,   // Phase 0 (parameter)
        dies: 2,   // Last read in phase 2
      },
      temp1: { 
        born: 1,   // Written in phase 1
        dies: 3,   // Last read in phase 3
      },
      temp2: { 
        born: 2,   // Written in phase 2
        dies: 4,   // Last read in phase 4
      },
      temp3: { 
        born: 3,   // Written in phase 3
        dies: 4,   // Last read in phase 4
      },
      result: { 
        born: 4,   // Written in phase 4
        dies: Infinity,  // Return value, never freed
      },
    };
  }
  
  optimizeAllocation(lifetimes: BufferLifetimes): BufferLayout {
    // Build conflict graph: two buffers conflict if lifetimes overlap
    const conflicts = new Map<string, Set<string>>();
    
    for (const [buf1, life1] of Object.entries(lifetimes)) {
      for (const [buf2, life2] of Object.entries(lifetimes)) {
        if (buf1 === buf2) continue;
        
        // Do lifetimes overlap?
        const overlaps = !(life1.dies < life2.born || life2.dies < life1.born);
        if (overlaps) {
          if (!conflicts.has(buf1)) conflicts.set(buf1, new Set());
          conflicts.get(buf1).add(buf2);
        }
      }
    }
    
    // Graph coloring: buffers with same color can share memory
    const coloring = this.graphColoring(conflicts);
    
    // Allocate physical buffers
    const layout: BufferLayout = { regions: [], totalSize: 0 };
    const physicalBuffers = new Map<number, number>();  // color → offset
    
    for (const [buffer, color] of Object.entries(coloring)) {
      const size = this.computeSize(buffer);
      
      if (!physicalBuffers.has(color)) {
        // Allocate new physical buffer
        physicalBuffers.set(color, layout.totalSize);
        layout.totalSize += size;
      }
      
      layout.regions.push({
        name: buffer,
        offset: physicalBuffers.get(color),
        size: size,
        lifetime: [lifetimes[buffer].born, lifetimes[buffer].dies],
        reuseOf: color,
      });
    }
    
    return layout;
  }
}

// Result:
BufferLayout {
  regions: [
    { name: 'input',  offset: 0,    size: 1000, lifetime: [0, 2] },
    { name: 'temp1',  offset: 1000, size: 1000, lifetime: [1, 3] },
    { name: 'temp2',  offset: 2000, size: 1000, lifetime: [2, 4] },
    { name: 'temp3',  offset: 1000, size: 1000, lifetime: [3, 4], reuseOf: temp1 },  // REUSE!
    { name: 'result', offset: 3000, size: 1000, lifetime: [4, ∞] },
  ],
  totalSize: 4000,  // Only 4 buffers needed (not 5!)
}

// Conflict analysis:
//   input conflicts with: temp1, temp2 (overlapping lifetimes)
//   temp1 conflicts with: input, temp2 (overlapping lifetimes)
//   temp2 conflicts with: input, temp1, temp3 (overlapping lifetimes)
//   temp3 conflicts with: temp2 (overlapping lifetimes)
//   temp1 does NOT conflict with temp3 (sequential lifetimes!)
//
// Memory allocation:
//   Color 0: input (offset 0)
//   Color 1: temp1, temp3 (offset 1000, SHARED!)
//   Color 2: temp2 (offset 2000)
//   Color 3: result (offset 3000)
//
// Savings: 5 buffers → 4 physical allocations (20% reduction)
```

### 4. Loop Unrolling

**Goal**: Eliminate branch instructions for small, fixed-iteration loops.

**Example**:

```typescript
// High-level code: Small fixed loop
for (let i = 0; i < 5; i++) {
  accumulator += computeValue(i);
}

// WITHOUT UNROLLING: Loop with branch
Routine compute_loop:
  SETI r0, 0           # i = 0
  SETI r1, 5           # limit = 5
  SETI r2, 0           # accumulator = 0
  
LOOP_START:
  MOV r3, r0           # Pass i as argument
  CALL COMPUTE_VALUE   # r0 = computeValue(i)
  ADD r2, r2, r0       # accumulator += result
  
  SETI r3, 1
  ADD r0, r0, r3       # i++
  SUB r3, r1, r0       # temp = limit - i
  BRANCH_GT r3, LOOP_START
  
  MOV r0, r2           # Return accumulator
  HALT

# Epochs: 5 iterations × ~8 instructions = ~40 epochs


// WITH UNROLLING: No branches
Routine compute_unrolled:
  SETI r2, 0           # accumulator = 0
  
  # Iteration 0
  SETI r0, 0
  CALL COMPUTE_VALUE
  ADD r2, r2, r0
  
  # Iteration 1
  SETI r0, 1
  CALL COMPUTE_VALUE
  ADD r2, r2, r0
  
  # Iteration 2
  SETI r0, 2
  CALL COMPUTE_VALUE
  ADD r2, r2, r0
  
  # Iteration 3
  SETI r0, 3
  CALL COMPUTE_VALUE
  ADD r2, r2, r0
  
  # Iteration 4
  SETI r0, 4
  CALL COMPUTE_VALUE
  ADD r2, r2, r0
  
  MOV r0, r2           # Return accumulator
  HALT

# Epochs: 5 iterations × 3 instructions = 15 epochs

# Benefits:
# - No branch instructions (no branch kernel invocations)
# - No branch misprediction overhead
# - Enables further optimizations (constant propagation for loop indices)
# - 62.5% faster (40 → 15 epochs)

# Drawback:
# - Larger code size (15 vs 10 instructions)
# - Only viable for small, compile-time-known iteration counts
```

**Unrolling Decision**:
```typescript
class LoopUnroller {
  shouldUnroll(loop: Loop): boolean {
    return (
      loop.hasStaticIterationCount() &&
      loop.iterationCount <= this.UNROLL_THRESHOLD &&
      !loop.hasComplexBody() &&
      this.estimatedCodeSize(loop) < this.MAX_CODE_SIZE
    );
  }
  
  private UNROLL_THRESHOLD = 8;  // Max iterations to unroll
  private MAX_CODE_SIZE = 100;    // Max instructions after unrolling
}
```

---

## Execution Patterns

### 1. SIMD Pattern (Same Instruction, Multiple Data)

**Characteristics**: Many VMs execute identical routine with different input data.

**Use Case**: Embarrassingly parallel operations (map, filter, element-wise transforms).

**Example**:

```typescript
// High-level: Process 1000 pixels
pixels.map(pixel => toGrayscale(pixel));

// Execution:
Phase 1: "Convert to grayscale"
  - Compile toGrayscale() to routine at IP=0
  - Launch 1000 VMs, all with IP=0
  - Each VM has unique vm_id (0-999)
  - Each VM reads pixel[vm_id], processes it, writes result[vm_id]
  
  All VMs execute identical instructions:
    Epoch 1: All execute SYSCALL_VMID
    Epoch 2: All execute MULI (compute offset)
    Epoch 3: All execute SYSCALL_READ (different addresses)
    Epoch 4: All execute MUL (grayscale computation)
    ...
  
  Perfect parallelism: 1000 VMs complete in same time as 1 VM
```

**Routine Pattern**:
```assembly
toGrayscale:
  SYSCALL_VMID r0          # r0 = my ID
  MULI r0, r0, 3           # r0 = offset (3 channels per pixel)
  
  # Read RGB
  SYSCALL_READ r1, r0      # r1 = R
  SETI r3, 1
  ADD r2, r0, r3
  SYSCALL_READ r2, r2      # r2 = G
  SETI r3, 2
  ADD r3, r0, r3
  SYSCALL_READ r3, r3      # r3 = B
  
  # Compute grayscale
  SCALE r1, r1, 0.299      # R * 0.299
  SCALE r2, r2, 0.587      # G * 0.587
  SCALE r3, r3, 0.114      # B * 0.114
  ADD r1, r1, r2
  ADD r1, r1, r3           # gray = sum
  
  # Write result
  SYSCALL_VMID r0
  SYSCALL_WRITE r0, r1
  HALT
```

### 2. Tree Reduction Pattern

**Characteristics**: Hierarchical aggregation across multiple phases.

**Use Case**: Reduction operations (sum, max, min, count).

**Example**:

```typescript
// High-level: Sum 1,000,000 elements
let total = data.reduce((acc, x) => acc + x, 0);

// Execution: Multi-phase logarithmic reduction

Phase 1: "Local reduction"
  - Input: 1,000,000 elements in shared_memory[0..999999]
  - Launch 1000 VMs
  - Each VM reduces 1000 elements locally
  - Output: 1000 partial sums in shared_memory[1000000..1000999]

Phase 2: "Tree level 0"
  - Input: 1000 partial sums
  - Launch 500 VMs
  - Each VM combines 2 partial sums
  - Output: 500 results in shared_memory[1001000..1001499]

Phase 3: "Tree level 1"
  - Input: 500 results
  - Launch 250 VMs
  - Output: 250 results

... (continue for log2(1000) = ~10 phases)

Phase 11: "Final reduction"
  - Input: 2 results
  - Launch 1 VM
  - Output: 1 final result

Total: 11 phases, ~1000 epochs
Compare to sequential: 1,000,000 additions = 1,000,000 epochs!
```

**Routines**:
```assembly
# Phase 1: Local reduction
local_reduce:
  SYSCALL_VMID r0          # r0 = my VM ID
  MULI r1, r0, 1000        # r1 = start offset (1000 elements per VM)
  SETI r2, 0               # r2 = accumulator
  SETI r3, 0               # r3 = loop counter
  
LOCAL_LOOP:
  ADD r4, r1, r3           # r4 = current element offset
  SYSCALL_READ r5, r4      # r5 = data[offset]
  ADD r2, r2, r5           # accumulator += element
  
  SETI r5, 1
  ADD r3, r3, r5           # counter++
  CMPI r5, r3, 1000        # r5 = counter - 1000
  BRANCH_LT r5, LOCAL_LOOP # if counter < 1000, continue
  
  # Write partial sum
  SETI r1, 1000000         # Output buffer offset
  ADD r1, r1, r0           # Output at buffer[vm_id]
  SYSCALL_WRITE r1, r2
  HALT

# Phase 2-11: Pairwise reduction
pairwise_reduce:
  SYSCALL_VMID r0          # r0 = my VM ID
  MULI r1, r0, 2           # r1 = first element offset (2 per VM)
  
  # Read input buffer address from phase metadata
  SETI r3, <input_buffer_offset>
  ADD r1, r1, r3
  
  SYSCALL_READ r2, r1      # r2 = first element
  SETI r4, 1
  ADD r1, r1, r4
  SYSCALL_READ r3, r1      # r3 = second element
  ADD r2, r2, r3           # sum = first + second
  
  # Write to output buffer
  SETI r1, <output_buffer_offset>
  ADD r1, r1, r0
  SYSCALL_WRITE r1, r2
  HALT
```

### 3. Pipeline Pattern (Producer-Consumer)

**Characteristics**: Streaming data through multiple stages with overlapping execution.

**Use Case**: Data processing pipelines where stages can run concurrently.

**Example**:

```typescript
// High-level: Streaming pipeline
async function* producer() {
  while (hasMore()) {
    yield generateData();
  }
}

async function consumer(item) {
  return processItem(item);
}

// Execution: Ring buffer coordination
Shared Memory Layout:
  ring_buffer: [
    data[0..9],        // 10 slots for items
    write_ptr: u32,    // Next write position
    read_ptr: u32,     // Next read position
  ]

Phase 1: Launch producer and consumer VMs simultaneously

Producer VMs (continuous):
  Loop:
    - Generate data item
    - Wait for space in ring buffer (write_ptr+1 != read_ptr)
    - Write item to ring_buffer[write_ptr]
    - Increment write_ptr (with wrap)
    - Repeat

Consumer VMs (continuous):
  Loop:
    - Wait for data in ring buffer (read_ptr != write_ptr)
    - Read item from ring_buffer[read_ptr]
    - Process item
    - Increment read_ptr (with wrap)
    - Repeat

Execution overlaps:
  - Producer generates item N while consumer processes item N-1
  - Throughput limited by slower stage
  - No barrier between stages (continuous flow)
```

**Routines**:
```assembly
# Producer routine
producer:
PROD_LOOP:
  CALL GENERATE_DATA       # r0 = new data item
  
  # Check if buffer has space
  SETI r1, <write_ptr_addr>
  SYSCALL_READ r2, r1      # r2 = write_ptr
  SETI r1, <read_ptr_addr>
  SYSCALL_READ r3, r1      # r3 = read_ptr
  
  SETI r4, 1
  ADD r4, r2, r4           # r4 = write_ptr + 1
  CMPI r5, r4, 10          # Check if wrap needed
  BRANCH_LT r5, NO_WRAP
  SETI r4, 0               # Wrap to 0
NO_WRAP:
  
  SUB r5, r4, r3           # r5 = next_write - read_ptr
  BRANCH_NE r5, BUFFER_FULL  # if equal, buffer full
  
  # Write data
  SETI r1, <buffer_start>
  ADD r1, r1, r2
  SYSCALL_WRITE r1, r0     # Write item
  
  # Update write_ptr
  SETI r1, <write_ptr_addr>
  SYSCALL_WRITE r1, r4     # Update pointer
  
  JUMP PROD_LOOP

BUFFER_FULL:
  SYSCALL_YIELD            # Wait for consumer to make space
  JUMP PROD_LOOP

# Consumer routine
consumer:
CONS_LOOP:
  # Check if buffer has data
  SETI r1, <write_ptr_addr>
  SYSCALL_READ r2, r1      # r2 = write_ptr
  SETI r1, <read_ptr_addr>
  SYSCALL_READ r3, r1      # r3 = read_ptr
  
  SUB r4, r2, r3           # r4 = write_ptr - read_ptr
  BRANCH_NE r4, BUFFER_EMPTY  # if equal, buffer empty
  
  # Read data
  SETI r1, <buffer_start>
  ADD r1, r1, r3
  SYSCALL_READ r0, r1      # r0 = item
  
  # Process item
  CALL PROCESS_ITEM        # Process in r0
  
  # Update read_ptr
  SETI r4, 1
  ADD r4, r3, r4           # r4 = read_ptr + 1
  CMPI r5, r4, 10
  BRANCH_LT r5, NO_WRAP2
  SETI r4, 0               # Wrap to 0
NO_WRAP2:
  
  SETI r1, <read_ptr_addr>
  SYSCALL_WRITE r1, r4     # Update pointer
  
  JUMP CONS_LOOP

BUFFER_EMPTY:
  SYSCALL_YIELD            # Wait for producer to generate data
  JUMP CONS_LOOP
```

### 4. Dataflow Pattern

**Characteristics**: Complex dependency graphs with multiple parallel paths.

**Use Case**: Image processing pipelines, multi-stage transformations.

**Example**:

```typescript
// High-level: Complex image processing
function processImage(image: Image): Image {
  // Stage 1: Parallel preprocessing
  let grayscale = toGrayscale(image);
  let edges = detectEdges(image);  // Independent of grayscale
  
  // Stage 2: Combine results
  let combined = combineFeatures(grayscale, edges);
  
  // Stage 3: Post-processing
  let enhanced = enhance(combined);
  
  return enhanced;
}

// Execution Plan (from dataflow analysis):

Phase 1: "Parallel preprocessing" (dependency level 0)
  Routine 1: toGrayscale
    - Entry IP: 0
    - VMs: 1000
    - Input: shared_memory[0..2999] (RGB pixels)
    - Output: shared_memory[3000..3999] (grayscale)
  
  Routine 2: detectEdges
    - Entry IP: 20
    - VMs: 1000
    - Input: shared_memory[0..2999] (RGB pixels)
    - Output: shared_memory[4000..4999] (edge map)
  
  Both routines run simultaneously:
    - VMs 0-499: Execute toGrayscale (IP=0)
    - VMs 500-999: Execute detectEdges (IP=20)
    - Some epochs have divergence (different IPs), but classification handles it

Phase 2: "Feature combination" (dependency level 1)
  Routine 3: combineFeatures
    - Entry IP: 50
    - VMs: 1000
    - Input: shared_memory[3000..4999] (both outputs from phase 1)
    - Output: shared_memory[5000..5999] (combined features)
    - Barrier: Must wait for phase 1 to complete

Phase 3: "Post-processing" (dependency level 2)
  Routine 4: enhance
    - Entry IP: 80
    - VMs: 1000
    - Input: shared_memory[5000..5999]
    - Output: shared_memory[6000..6999] (final result)
    - Barrier: Must wait for phase 2 to complete
```

**Execution Timeline**:
```
Time 0-50ms: Phase 1
  Epochs 1-N: VMs execute toGrayscale and detectEdges in parallel
  [Barrier: Wait for all VMs to halt]

Time 50-80ms: Phase 2
  Epochs 1-M: All VMs execute combineFeatures
  [Barrier: Wait for all VMs to halt]

Time 80-110ms: Phase 3
  Epochs 1-K: All VMs execute enhance
  [Barrier: Wait for all VMs to halt]

Total: ~110ms for complete pipeline
```

---

## Performance Characteristics

### Scalability Analysis

#### Single VM (CPU Baseline)

```
Per instruction cost:
- Linear (matrix multiply 22×22): ~0.001ms
- Oracle (MUL/DIV): ~0.0001ms
- Branch (condition check): ~0.00005ms
- I/O (memory access): ~0.0002ms

Example program (100 instructions):
- 60 linear, 30 oracle, 5 branch, 5 I/O
- Total: 60×0.001 + 30×0.0001 + 5×0.00005 + 5×0.0002
        = 0.06 + 0.003 + 0.00025 + 0.001
        = 0.06425ms per VM
```

#### 1000 VMs (GPU Batched)

```
Per epoch cost (all VMs execute one instruction):
- Classification: ~0.01ms (atomic operations)
- Linear kernel (600 VMs): ~0.05ms (matrix multiply batch)
- Oracle kernel (300 VMs): ~0.02ms (arithmetic batch)
- Branch kernel (50 VMs): ~0.01ms (condition evaluation)
- I/O kernel (50 VMs): ~0.01ms (memory access)

Total per epoch: ~0.09ms

100-instruction program:
- 100 epochs × 0.09ms = 9ms total
- 1000 VMs complete in 9ms
- Effective: 100,000 instruction executions in 9ms

Speedup vs sequential:
- Sequential: 1000 VMs × 0.06425ms = 64.25ms
- Parallel: 9ms
- Speedup: 7.1x

Throughput:
- 100,000 instructions / 9ms = 11.1 million instructions/sec
```

### Memory Efficiency

```
Per VM Storage:
- Transformation vector: 88 bytes (22 floats)
- Metadata: 40 bytes (vm_id, stack_ptr, status, padding)
- Total: 128 bytes (aligned for GPU memory coalescing)

Scaling:
- 1,000 VMs: 128KB (fits in L2 cache)
- 10,000 VMs: 1.28MB (fits in L3 cache)
- 100,000 VMs: 12.8MB (main memory)
- 1,000,000 VMs: 128MB (practical limit for consumer GPUs)

Shared Memory:
- Typical: 1GB for input/output/intermediate buffers
- Organized by compiler with lifetime analysis
- Buffer reuse reduces actual allocation by 20-50%
```

### Instruction Distribution Impact

Different program compositions affect performance:

```
Program A: Numerical computation (linear-heavy)
- 70% linear operations
- 20% oracle operations
- 10% branches

Epoch time: 0.05×0.7 + 0.02×0.2 + 0.01×0.1 = 0.044ms
100 instructions: 4.4ms for 1000 VMs

Program B: Control-heavy
- 30% linear operations
- 30% oracle operations
- 40% branches

Epoch time: 0.05×0.3 + 0.02×0.3 + 0.01×0.4 = 0.025ms
100 instructions: 2.5ms for 1000 VMs

Observation: Linear operations are slower but exhibit better 
parallelism. Control-heavy programs are faster per epoch but 
may have more divergence issues.
```

### Loop Performance

Loops require multiple epochs per iteration:

```
Example: 10-iteration loop, 5 instructions per iteration

Sequential execution (traditional VM):
- 10 iterations × 5 instructions = 50 instructions
- Time: 50 × 0.001ms = 0.05ms per VM

Linear Algebra VM (single VM):
- 10 iterations × 5 epochs = 50 epochs
- Time: 50 × 0.09ms = 4.5ms
- Overhead: 90x slower than traditional VM

BUT with 1000 VMs (same loop):
- Still 50 epochs
- All VMs progress together through loop
- Time: still 4.5ms (same as single VM!)
- Effective: 1000 VMs × 50 instructions / 4.5ms = 11M instructions/sec

Key insight: Loop overhead is amortized across massive parallelism.
Individual VM latency is high, but throughput is exceptional.
```

### Branch Divergence Impact

```
Scenario: 1000 VMs, 50% take branch, 50% don't

Traditional SIMT (like GPU SIMD):
- Execute taken path: 500 active threads, 500 idle
- Execute not-taken path: 500 active threads, 500 idle
- Utilization: 50% (serialized execution)

Linear Algebra VM:
- Epoch N: Classification separates VMs
  - 500 VMs classified to branch_taken group
  - 500 VMs classified to branch_not_taken group
- Both groups execute in parallel (different IPs)
- Utilization: 100% (no serialization)

Result: Branch divergence has minimal impact due to classification.
```

### Best-Case vs Worst-Case Performance

```
Best Case: SIMD pattern with linear operations
- All VMs execute identical linear operations
- Perfect classification (all VMs in one group)
- Zero divergence
- Maximum GPU utilization

Example: 1000 VMs, 100 linear instructions
- 100 epochs × 0.05ms = 5ms
- Throughput: 20 million instructions/sec

Worst Case: Heavy divergence with complex control flow
- VMs spread across many different IPs
- Small groups per classification
- Frequent branches causing re-classification
- High I/O overhead

Example: 1000 VMs, 100 instructions (50% branches, poor locality)
- Average group size: 50 VMs per unique IP
- 20 different groups executing over time
- Classification overhead dominates
- 100 epochs × 0.15ms = 15ms (3x slower)
- Throughput: 6.7 million instructions/sec

Mitigation: Compiler optimizations (fusion, unrolling) reduce divergence.
```

---

## Implementation Guide

### Compiler Implementation

```typescript
interface CompilerConfig {
  optimizationLevel: 0 | 1 | 2 | 3;
  enableFusion: boolean;
  enableSpecialization: boolean;
  enableUnrolling: boolean;
  maxUnrollIterations: number;
  targetGPU: 'nvidia' | 'amd' | 'intel' | 'webgpu';
}

class VMCompiler {
  constructor(private config: CompilerConfig) {}
  
  compile(source: string): VMExecutable {
    // 1. Parse and build AST
    const ast = this.parse(source);
    
    // 2. Type checking and semantic analysis
    this.typeCheck(ast);
    
    // 3. Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(ast);
    
    // 4. Optimization passes
    let optimizedAST = ast;
    if (this.config.enableFusion) {
      optimizedAST = this.fuseOperations(optimizedAST);
    }
    if (this.config.enableSpecialization) {
      optimizedAST = this.partialEvaluate(optimizedAST);
    }
    if (this.config.enableUnrolling) {
      optimizedAST = this.unrollLoops(optimizedAST);
    }
    optimizedAST = this.eliminateDeadCode(optimizedAST);
    
    // 5. Generate phases from dependency graph
    const phases = this.generatePhases(dependencyGraph);
    
    // 6. Compile routines
    const routines: RoutineInfo[] = [];
    const instructions: Instruction[] = [];
    const matrices: number[] = [];
    
    for (const phase of phases) {
      for (const operation of phase.operations) {
        const routine = this.compileRoutine(operation);
        routines.push({
          name: operation.name,
          entryPoint: instructions.length,
          instructionCount: routine.instructions.length,
          estimatedEpochs: this.estimateEpochs(routine),
          memoryUsage: this.analyzeMemoryUsage(routine),
        });
        
        instructions.push(...routine.instructions);
        
        // Generate matrices for linear operations
        for (const inst of routine.instructions) {
          if (inst.opcode < 10) {  // Linear operation
            matrices.push(...this.generateMatrix(inst));
          }
        }
      }
    }
    
    // 7. Allocate buffers with lifetime analysis
    const bufferLayout = this.allocateBuffers(phases, routines);
    
    // 8. Determine VM allocation strategy
    const executionPlan = this.generateExecutionPlan(
      phases,
      routines,
      bufferLayout
    );
    
    // 9. Package executable
    return {
      metadata: {
        version: '3.0',
        totalInstructions: instructions.length,
        linearInstructionCount: instructions.filter(i => i.opcode < 10).length,
        routineCount: routines.length,
        phaseCount: phases.length,
        estimatedEpochs: this.estimateTotalEpochs(executionPlan),
        resourceRequirements: {
          maxVMs: this.calculateMaxVMs(executionPlan),
          sharedMemoryBytes: bufferLayout.totalSize,
          callStackDepth: this.calculateMaxCallDepth(routines),
        },
      },
      instructions,
      matrices: new Float32Array(matrices),
      routines,
      executionPlan,
      bufferLayout,
    };
  }
  
  private compileRoutine(operation: Operation): CompiledRoutine {
    const instructions: Instruction[] = [];
    
    // Generate prologue (VM ID, buffer offset computation)
    instructions.push(...this.generatePrologue(operation));
    
    // Compile operation body
    instructions.push(...this.compileOperationBody(operation));
    
    // Generate epilogue (write results, halt)
    instructions.push(...this.generateEpilogue(operation));
    
    return { instructions };
  }
  
  private generateMatrix(inst: Instruction): number[] {
    // Generate 22×22 transformation matrix for linear operation
    const matrix = new Array(484).fill(0);
    
    // Start with identity matrix
    for (let i = 0; i < 22; i++) {
      matrix[i * 22 + i] = 1.0;
    }
    
    // Modify matrix based on instruction type
    switch (inst.opcode) {
      case 0:  // ADD
        this.generateAddMatrix(matrix, inst);
        break;
      case 1:  // SUB
        this.generateSubMatrix(matrix, inst);
        break;
      // ... other linear operations
    }
    
    // All linear operations increment IP
    matrix[0 * 22 + 21] = 1.0;  // IP += 1 (from homogeneous coordinate)
    
    return matrix;
  }
}
```

### Runtime Implementation

```typescript
class GPUVMRuntime {
  private device: GPUDevice;
  private buffers: GPUBuffers;
  private pipelines: GPUPipelines;
  private bindGroups: GPUBindGroups;
  private executable: VMExecutable;
  
  async initialize(executable: VMExecutable): Promise<void> {
    this.executable = executable;
    
    // Get GPU device
    const adapter = await navigator.gpu.requestAdapter();
    this.device = await adapter.requestDevice();
    
    // Allocate buffers
    await this.allocateGPUBuffers(executable);
    
    // Create compute pipelines
    await this.createComputePipelines();
    
    // Create bind groups
    await this.createBindGroups();
    
    // Upload program data
    await this.uploadProgramData(executable);
  }
  
  private async allocateGPUBuffers(executable: VMExecutable): Promise<void> {
    const maxVMs = executable.metadata.resourceRequirements.maxVMs;
    
    // VM states
    this.buffers.vmStates = this.device.createBuffer({
      size: maxVMs * 128,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    
    // Instructions
    this.buffers.instructions = this.device.createBuffer({
      size: executable.instructions.length * 20,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    // Matrices
    this.buffers.matrices = this.device.createBuffer({
      size: executable.matrices.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    // Shared memory
    this.buffers.sharedMemory = this.device.createBuffer({
      size: executable.bufferLayout.totalSize * 4,  // 4 bytes per float
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    
    // Call stack
    const maxCallFrames = maxVMs * executable.metadata.resourceRequirements.callStackDepth;
    this.buffers.callStack = this.device.createBuffer({
      size: maxCallFrames * 32,
      usage: GPUBufferUsage.STORAGE,
    });
    
    // Classification buffers
    const classificationSize = maxVMs * 4;
    this.buffers.classification = this.device.createBuffer({
      size: 16,  // 4 atomic counters
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    this.buffers.linearIndices = this.createBuffer(classificationSize);
    this.buffers.oracleIndices = this.createBuffer(classificationSize);
    this.buffers.branchIndices = this.createBuffer(classificationSize);
    this.buffers.ioIndices = this.createBuffer(classificationSize);
  }
  
  async executeProgram(): Promise<ArrayBuffer> {
    for (const phase of this.executable.executionPlan.phases) {
      await this.executePhase(phase);
    }
    
    // Read final results from shared memory
    return await this.readResults();
  }
  
  private async executePhase(phase: Phase): Promise<void> {
    // Initialize VMs for all routines in this phase
    await this.initializePhaseVMs(phase);
    
    // Execute epochs until all VMs halt
    let activeVMs = this.countActiveVMs();
    
    while (activeVMs > 0) {
      await this.executeEpoch();
      activeVMs = await this.countActiveVMs();
    }
  }
  
  private async executeEpoch(): Promise<void> {
    // Reset classification counters
    await this.resetClassification();
    
    // 1. Classification pass
    const commandEncoder = this.device.createCommandEncoder();
    const classifyPass = commandEncoder.beginComputePass();
    classifyPass.setPipeline(this.pipelines.classification);
    classifyPass.setBindGroup(0, this.bindGroups.classification);
    classifyPass.dispatchWorkgroups(
      Math.ceil(this.currentVMCount / 256)
    );
    classifyPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
    
    // Wait for classification
    await this.device.queue.onSubmittedWorkDone();
    
    // 2. Read classification counts
    const counts = await this.readClassificationCounts();
    
    // 3. Execute kernels in parallel
    const executionEncoder = this.device.createCommandEncoder();
    const executionPass = executionEncoder.beginComputePass();
    
    if (counts.linear > 0) {
      executionPass.setPipeline(this.pipelines.linear);
      executionPass.setBindGroup(0, this.bindGroups.linear);
      executionPass.dispatchWorkgroups(Math.ceil(counts.linear / 256));
    }
    
    if (counts.oracle > 0) {
      executionPass.setPipeline(this.pipelines.oracle);
      executionPass.setBindGroup(0, this.bindGroups.oracle);
      executionPass.dispatchWorkgroups(Math.ceil(counts.oracle / 256));
    }
    
    if (counts.branch > 0) {
      executionPass.setPipeline(this.pipelines.branch);
      executionPass.setBindGroup(0, this.bindGroups.branch);
      executionPass.dispatchWorkgroups(Math.ceil(counts.branch / 256));
    }
    
    if (counts.io > 0) {
      executionPass.setPipeline(this.pipelines.io);
      executionPass.setBindGroup(0, this.bindGroups.io);
      executionPass.dispatchWorkgroups(Math.ceil(counts.io / 256));
    }
    
    executionPass.end();
    this.device.queue.submit([executionEncoder.finish()]);
    
    await this.device.queue.onSubmittedWorkDone();
  }
}
```

---

## Use Cases

### Ideal Workloads

#### 1. Embarrassingly Parallel Computations

**Characteristics**:
- Many independent tasks
- Minimal inter-task communication
- Regular control flow
- Same operation on different data

**Examples**:
- Monte Carlo simulations (each VM runs one trial)
- Ray tracing (each VM traces one ray)
- Batch image processing (each VM processes one pixel/image)
- Parameter sweeps (each VM tests one parameter combination)
- Cryptographic operations (each VM encrypts one block)

**Performance**: Excellent - near-linear scaling with VM count.

**Example**: Ray tracing 1920×1080 pixels with 1000 VMs:
- 2,073,600 pixels / 1000 VMs = 2074 pixels per VM
- All VMs execute in parallel
- Completion time ≈ time for single VM to process 2074 pixels

#### 2. Agent-Based Simulations

**Characteristics**:
- Many autonomous agents
- Local interactions (via shared memory)
- Simple agent logic
- Periodic synchronization

**Examples**:
- Flocking/swarming behaviors
- Cellular automata
- Traffic simulations
- Epidemiological models
- Particle systems

**Performance**: Good - occasional shared memory access for neighbor queries.

**Example**: Flocking simulation with 10,000 agents:
- Each VM represents one agent
- Phase 1: Update velocities (reads neighbor positions from shared memory)
- Phase 2: Update positions (writes to shared memory)
- Synchronization between phases ensures consistency

#### 3. Numerical Computing

**Characteristics**:
- Matrix operations
- Element-wise transformations
- Reduction operations
- Linear algebra dominates

**Examples**:
- Linear algebra operations
- Scientific simulations (fluid dynamics, heat transfer)
- Data analytics (statistical computations)
- Signal processing (FFT, filtering)

**Performance**: Excellent - linear operations dominate, perfect GPU utilization.

#### 4. Data Transformations

**Characteristics**:
- Per-element computation
- Minimal branching
- Data lookups from shared memory
- Predictable access patterns

**Examples**:
- Image filters (blur, sharpen, color correction)
- Video post-processing
- Audio effects
- Data encoding/decoding

**Performance**: Excellent - maps naturally to SIMD pattern.

### Challenging Workloads

#### 1. Irregular Control Flow

**Characteristics**:
- Heavy branching
- Data-dependent execution paths
- Nested conditionals
- Unpredictable divergence

**Challenge**: Branch divergence separates VMs into many small groups, reducing effective parallelism.

**Mitigation**: 
- Restructure algorithms to minimize branches
- Use arithmetic instead of conditionals where possible
- Apply loop unrolling to eliminate some branches

**Example**: Decision trees with many branches - better to use table lookups.

#### 2. Dynamic Data Structures

**Characteristics**:
- Pointer chasing
- Linked lists, trees
- Dynamic memory allocation
- Irregular memory access

**Challenge**: No indirect addressing in VM memory; requires shared memory with runtime addressing overhead.

**Mitigation**: 
- Use shared memory for complex structures
- Keep VM memory for scratch space
- Pre-allocate and index structures by VM ID

#### 3. Recursive Algorithms

**Characteristics**:
- Unbounded call depth
- Variable execution time
- Stack-intensive
- Different recursion depths per VM

**Challenge**: Call stack grows unbounded; VMs with different recursion depths exhibit high divergence.

**Mitigation**:
- Convert to iterative algorithms when possible
- Limit recursion depth
- Use work queues instead of recursion

#### 4. I/O-Intensive Tasks

**Characteristics**:
- Frequent external memory access
- Inter-VM communication
- Synchronization requirements
- Memory bandwidth bound

**Challenge**: I/O kernel may become bottleneck; shared memory bandwidth limits throughput.

**Mitigation**:
- Minimize syscalls through batching
- Use local VM memory when possible
- Overlap computation with I/O

---

## Future Extensions

### 1. Sparse Matrix Optimization

**Observation**: Most transformation matrices are sparse (many zeros).

**Current**: Full 22×22 matrices = 484 floats = 1936 bytes each

**Optimization**: Use compressed sparse row (CSR) format:
```
struct SparseMatrix {
  values: array<f32>,       // Non-zero values
  col_indices: array<u32>,  // Column index of each value
  row_pointers: array<u32>, // Start index for each row
}
```

**Benefit**: 5-10x reduction in matrix storage; faster matrix-vector multiply for sparse cases.

**Example**:
```
ADD matrix (22×22 = 484 floats):
  Non-zeros: ~30 (rest are 0 or 1 on diagonal)
  CSR storage: 30 values + 30 indices + 23 pointers = 83 elements vs 484
  Savings: 83% reduction
```

### 2. Mixed Precision

**Idea**: Use FP16 for operations where full FP32 precision isn't needed.

**Benefit**: 2x throughput for FP16 operations; reduced memory bandwidth.

**Challenge**: Maintaining accuracy for accumulations and comparisons.

**Implementation**:
```wgsl
struct VMState {
  IP: f32,          // Keep as FP32 (needs precision for large programs)
  registers: array<f16, 4>,  // Half precision for data
  memory: array<f16, 16>,
  homogeneous: f32,
}

// Matrices in mixed precision
matrices_fp16: array<f16>  // For most linear ops
matrices_fp32: array<f32>  // For operations needing precision
```

### 3. Predication for Branches

**Idea**: Instead of branching, use predicated execution (compute both paths, select result).

**Benefit**: Reduces branch divergence; keeps VMs synchronized.

**Cost**: Wasted computation on untaken path.

**Implementation**:
```assembly
# Traditional branch
BRANCH_GT r0, TAKEN
  # Not taken path
  ADD r1, r1, 5
  JUMP END
TAKEN:
  # Taken path
  MUL r1, r1, 2
END:

# Predicated execution
CMP r2, r0, 0           # r2 = condition (> 0)
ADD r3, r1, 5           # Compute not-taken result
MUL r4, r1, 2           # Compute taken result
SELECT r1, r2, r4, r3   # r1 = r2 ? r4 : r3 (new instruction)
```

**Use Case**: Short branch bodies with balanced path probability.

### 4. Larger State Vectors

**Idea**: Support 32 or 64-element state vectors for more registers/memory.

**Benefit**: More expressive VM; fewer memory spills to shared memory.

**Cost**: Larger matrices (1024 or 4096 floats); worse cache behavior.

**Trade-off**: Application-dependent - useful for complex per-VM logic.

**Example**:
```
32-element state: 8 registers + 24 memory
  Matrix: 32×32 = 1024 floats = 4KB each
  May still fit in cache for moderate program sizes
```

### 5. Dynamic VM Allocation

**Idea**: Spawn/kill VMs during execution (e.g., for particle systems, tree traversal).

**Implementation**: Add SPAWN and KILL syscalls:
```assembly
SYSCALL_SPAWN entry_ip, input_data  # Create new VM at entry point
SYSCALL_KILL                        # Terminate this VM
```

**Benefit**: More flexible for dynamic workloads.

**Challenge**: Managing VM lifecycle; load balancing; defragmentation.

---

## Conclusion

This GPU-accelerated virtual machine architecture demonstrates that program execution can be effectively represented as linear algebra transformations when combined with specialized kernels for non-linear operations. The hierarchical design - with a high-level language compiling to VM routines executing as GPU kernels - enables massive parallelization while maintaining computational accuracy.

### Key Strengths

1. **Massive Parallelism**: Execute 1000-100,000 VMs simultaneously
2. **Memory Efficiency**: Only 128 bytes per VM instance
3. **Zero Divergence**: Linear operations (60-80% of instructions) have perfect thread coherence
4. **Exact Computation**: No approximation errors in oracle operations
5. **Static Optimization**: Compiler has complete program visibility for aggressive optimization
6. **Flexible Execution**: Supports SIMD, reduction, pipeline, and dataflow patterns

### Best Applications

- **Embarrassingly parallel computations**: Near-linear scaling
- **Agent-based simulations**: Natural mapping to VM instances
- **Numerical computing**: Linear algebra operations excel
- **Data transformations**: Efficient batch processing

### Key Limitations

- **Fixed memory addressing**: VM memory uses compile-time constants only
- **Small register/memory capacity**: 4 registers, 16 memory slots per VM
- **Loop latency**: Multiple epochs per iteration (high single-VM latency)
- **No indirect calls**: Function targets must be compile-time constants

### Performance Profile

- **Throughput-Oriented**: Excellent for batch processing (10M+ instructions/sec)
- **Latency-Sensitive**: Poor for single-task execution (90x slower than traditional VM)
- **Scales with Parallelism**: Performance improves linearly with VM count
- **Balanced Workloads**: Best when 60-80% of instructions are linear operations

The architecture is particularly effective for workloads where many VMs execute similar code paths, linear operations dominate, and massive parallelism is more valuable than single-VM latency. The combination of compile-time optimization, phase-based execution, and specialized GPU kernels creates a unique platform for GPU-accelerated computation.
             
