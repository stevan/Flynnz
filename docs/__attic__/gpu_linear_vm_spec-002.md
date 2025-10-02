# GPU-Accelerated Linear Algebra Virtual Machine
## Unified Architecture Specification

**Version:** 2.0  
**Date:** October 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [State Representation](#state-representation)
4. [Instruction Model](#instruction-model)
5. [Memory Architecture](#memory-architecture)
6. [Kernel Architecture](#kernel-architecture)
7. [Control Flow](#control-flow)
8. [Execution Model](#execution-model)
9. [Performance Characteristics](#performance-characteristics)
10. [Limitations and Trade-offs](#limitations-and-trade-offs)

---

## Overview

This virtual machine architecture represents program execution as linear algebra transformations, enabling massive parallelization on GPUs. The design allows thousands of VM instances to execute simultaneously while maintaining computational accuracy through a hybrid approach:

- **Linear operations** (60-80% of instructions): Pure matrix transformations
- **Non-linear operations**: Exact computation via specialized GPU kernels
- **Control flow**: Scheduler-based rescheduling without matrix encoding

### Key Design Principles

1. **Harvard Architecture**: Instructions stored separately from VM memory
2. **Batch Coherence**: VMs grouped by instruction type to eliminate thread divergence
3. **Static Scheduling**: Compile-time analysis enables optimal GPU resource allocation
4. **Hybrid Execution**: Linear algebra for transformations, specialized kernels for everything else

---

## Core Architecture

### System Layers

```
┌─────────────────────────────────────────┐
│   High-Level Language (Future Layer)    │
│   - Multi-paradigm scripting            │
│   - Dataflow graphs                     │
│   - Optimization passes                 │
└──────────────────┬──────────────────────┘
                   │ Compiles to
                   ↓
┌─────────────────────────────────────────┐
│   VM Program (Bytecode)                 │
│   - Instruction sequences               │
│   - Transformation matrices             │
│   - Metadata (dependencies, hints)      │
└──────────────────┬──────────────────────┘
                   │ Executed by
                   ↓
┌─────────────────────────────────────────┐
│   GPU Runtime & Scheduler               │
│   - VM instance management              │
│   - Kernel dispatch                     │
│   - Memory allocation                   │
└──────────────────┬──────────────────────┘
                   │ Executes via
                   ↓
┌─────────────────────────────────────────┐
│   Five Specialized GPU Kernels          │
│   1. Classification                     │
│   2. Linear Transformation              │
│   3. Oracle Operations                  │
│   4. Branch Resolution                  │
│   5. I/O & Scheduling                   │
└─────────────────────────────────────────┘
```

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

**Size**: 22 floats × 4 bytes = 88 bytes per VM

#### 2. Metadata Structure (not in transformation vector)

Additional state tracked separately for scheduling and control flow:

```wgsl
struct VMState {
  // Transformation vector (22 floats)
  IP: f32,
  registers: array<f32, 4>,
  memory: array<f32, 16>,
  homogeneous: f32,  // Always 1.0
  
  // Metadata (not transformed by matrices)
  stack_pointer: u32,
  status: u32,  // RUNNING, BLOCKED, YIELDED, HALTED
  _padding: array<u32, 2>,  // Alignment to 128 bytes
}
```

**Total Size**: 128 bytes per VM (aligned for GPU memory coalescing)

### Why Floating Point IP?

The instruction pointer is stored as a float (despite being semantically an integer) because:

1. The entire state vector undergoes matrix multiplication in the linear kernel
2. Matrix operations require uniform types (all floats)
3. Linear transformations can increment IP: `new_IP = old_IP + 1.0`

The cost of casting (`u32(state.IP)` for indexing) is negligible compared to the benefit of pure linear algebra operations.

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

### Storage Layout

Instructions exist in two forms:

1. **Instruction Metadata** (`program: array<Instruction>`)
   - Compact representation: 20 bytes per instruction
   - Used by classification kernel to determine instruction type
   - Contains operand information for all instruction types

2. **Transformation Matrices** (`matrices: array<f32>`)
   - Only for linear operations (opcodes 0-9)
   - 22×22 = 484 floats per linear instruction
   - Indexed by: `matrix_offset = ip * 484`

### Opcode Categories

| Range  | Category              | Execution Kernel | Matrix? |
|--------|-----------------------|------------------|---------|
| 0-9    | Linear Operations     | Linear           | Yes     |
| 10-19  | Oracle Operations     | Oracle           | No      |
| 20-49  | I/O Operations        | I/O              | No      |
| 50-69  | Branch Operations     | Branch           | No      |
| 70-99  | Reserved              | -                | -       |

### Instruction Set

#### Linear Operations (0-9)

Pure linear transformations compiled to 22×22 matrices:

- `ADD r_dest, r_src1, r_src2` (0): `r_dest = r_src1 + r_src2`
- `SUB r_dest, r_src1, r_src2` (1): `r_dest = r_src1 - r_src2`
- `MOV r_dest, r_src` (2): `r_dest = r_src`
- `SETI r_dest, immediate` (3): `r_dest = immediate`
- `LOAD r_dest, addr` (4): `r_dest = mem[addr]` (addr is compile-time constant)
- `STORE r_src, addr` (5): `mem[addr] = r_src` (addr is compile-time constant)
- `COPY mem_dest, mem_src` (6): `mem[dest] = mem[src]`
- `CLEAR r_dest` (7): `r_dest = 0`
- `NEG r_dest, r_src` (8): `r_dest = -r_src`
- `SCALE r_dest, r_src, factor` (9): `r_dest = r_src * factor` (factor is immediate)

#### Oracle Operations (10-19)

Non-linear arithmetic requiring exact computation:

- `MUL r_dest, r_src1, r_src2` (10): `r_dest = r_src1 * r_src2`
- `DIV r_dest, r_src1, r_src2` (11): `r_dest = r_src1 / r_src2`
- `MOD r_dest, r_src1, r_src2` (12): `r_dest = r_src1 % r_src2`
- `CMP r_dest, r_src1, r_src2` (13): `r_dest = r_src1 - r_src2` (sets condition)
- `MIN r_dest, r_src1, r_src2` (14): `r_dest = min(r_src1, r_src2)`
- `MAX r_dest, r_src1, r_src2` (15): `r_dest = max(r_src1, r_src2)`
- `ABS r_dest, r_src` (16): `r_dest = abs(r_src)`
- `SQRT r_dest, r_src` (17): `r_dest = sqrt(r_src)`
- `SIN r_dest, r_src` (18): `r_dest = sin(r_src)`
- `COS r_dest, r_src` (19): `r_dest = cos(r_src)`

#### I/O Operations (20-49)

System calls for external memory access:

- `SYSCALL_READ r_dest, r_addr` (20): `r_dest = shared_memory[r_addr]`
- `SYSCALL_WRITE r_addr, r_src` (21): `shared_memory[r_addr] = r_src`
- `SYSCALL_YIELD` (22): Suspend execution, reschedule later
- `SYSCALL_HALT` (23): Stop execution permanently

#### Branch Operations (50-69)

Control flow resolution:

- `BRANCH_EQ r_cond, target` (50): Jump to target if `r_cond == 0`
- `BRANCH_NE r_cond, target` (51): Jump to target if `r_cond != 0`
- `BRANCH_LT r_cond, target` (52): Jump to target if `r_cond < 0`
- `BRANCH_GT r_cond, target` (53): Jump to target if `r_cond > 0`
- `BRANCH_LE r_cond, target` (54): Jump to target if `r_cond <= 0`
- `BRANCH_GE r_cond, target` (55): Jump to target if `r_cond >= 0`
- `JUMP target` (56): Unconditional jump
- `CALL target` (60): Jump to target, save return address
- `RETURN` (61): Return from function call

---

## Memory Architecture

### Two-Tier Memory Model

#### 1. VM Memory (Part of State Vector)

- **Size**: 16 floats (64 bytes)
- **Addressing**: Compile-time constants only
- **Purpose**: Fast, per-VM local storage
- **Access**: Via LOAD/STORE instructions (linear operations)
- **Use Cases**: Loop counters, temporary values, function parameters

**Why compile-time addresses?** This restriction enables linear transformations:

```
LOAD r0, 5  →  Matrix that copies mem[5] to r0
STORE r1, 3 →  Matrix that copies r1 to mem[3]
```

Dynamic addressing would require non-linear operations (array indexing).

#### 2. Shared Memory (External Buffer)

- **Size**: Configurable (typically MB-GB range)
- **Addressing**: Runtime values in registers
- **Purpose**: Inter-VM communication, large datasets
- **Access**: Via SYSCALL_READ/SYSCALL_WRITE (I/O operations)
- **Use Cases**: Input/output data, message passing, coordination

**Example**:
```assembly
SETI r1, 1000          # Address to read
SYSCALL_READ r0, r1    # r0 = shared_memory[1000]
ADD r0, r0, r2         # Process value
SETI r1, 2000          # Address to write
SYSCALL_WRITE r1, r0   # shared_memory[2000] = r0
```

### Memory Layout (GPU)

```
┌────────────────────────────────────────┐
│  Instruction Metadata                  │
│  - program: array<Instruction>         │
│  - Size: 20 bytes × num_instructions   │
│  - Access: Read-only                   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Transformation Matrices               │
│  - matrices: array<f32>                │
│  - Size: 484 floats × num_linear_inst  │
│  - Access: Read-only, texture memory   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  VM States                             │
│  - vm_states: array<VMState>           │
│  - Size: 128 bytes × num_vms           │
│  - Access: Read-write                  │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Call Stack                            │
│  - call_stack: array<CallFrame>        │
│  - Size: dynamic, per active call      │
│  - Access: Read-write                  │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Shared Memory                         │
│  - shared_memory: array<f32>           │
│  - Size: configurable (MB-GB)          │
│  - Access: Read-write via syscalls     │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Classification Buffers                │
│  - linear_indices: array<u32>          │
│  - oracle_indices: array<u32>          │
│  - branch_indices: array<u32>          │
│  - io_indices: array<u32>              │
│  - Size: 4 bytes × num_vms (worst case)│
│  - Access: Write by classification,    │
│           read by execution kernels    │
└────────────────────────────────────────┘
```

---

## Kernel Architecture

### Five-Kernel Design

The system uses five specialized GPU kernels to eliminate thread divergence and maximize parallelism.

### 1. Classification Kernel

**Purpose**: Categorize all VMs by their current instruction type.

**Execution**: Once per epoch, processes all active VMs.

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
  if (state.status != STATUS_RUNNING) { return; }  // Skip inactive VMs
  
  let ip = u32(state.IP);
  let inst = program[ip];
  
  // Route to appropriate kernel based on opcode range
  if (inst.opcode < 10u) {  // Linear operations
    let idx = atomicAdd(&classification.linear_count, 1u);
    linear_indices[idx] = vm_id;
  } else if (inst.opcode < 20u) {  // Oracle operations
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

**Output**: Four compact arrays of VM indices, one per kernel type.

**Performance**: ~0.01ms for 1000 VMs (trivial per-VM work).

---

### 2. Linear Transformation Kernel

**Purpose**: Execute matrix-vector multiplication for all VMs performing linear operations.

**Key Feature**: Zero thread divergence - all threads execute identical matrix operations.

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

**Performance**: ~0.05ms for 600 VMs (matrix multiply is computationally intensive but highly parallel).

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

**Divergence**: Minimal - only 10 opcodes create branches, affecting a small subset of VMs.

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
    default: {}
  }
  
  state.IP += 1.0;  // Increment instruction pointer
  vm_states[vm_id] = state;
}
```

**Performance**: ~0.02ms for 300 VMs (simple arithmetic, some branch divergence).

---

### 4. Branch Resolution Kernel

**Purpose**: Evaluate branch conditions and update instruction pointers.

**Key Insight**: Control flow is resolved by the scheduler, not encoded in matrices.

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

**Performance**: ~0.02ms for 100 VMs (minimal per-VM work, some divergence on CALL/RETURN).

---

### 5. I/O and Scheduling Kernel

**Purpose**: Manage system calls, inter-VM communication, and execution scheduling.

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
    case 20u: {  // SYSCALL_READ
      // operand0 = destination register
      // operand1 = address register
      let addr = u32(state.registers[operand1]);
      state.registers[operand0] = shared_memory[addr];
      state.IP += 1.0;
    }
    case 21u: {  // SYSCALL_WRITE
      // operand0 = address register
      // operand1 = source register
      let addr = u32(state.registers[operand0]);
      shared_memory[addr] = state.registers[operand1];
      state.IP += 1.0;
    }
    case 22u: {  // SYSCALL_YIELD
      // Don't increment IP - will resume at same instruction
      state.status = STATUS_YIELDED;
    }
    case 23u: {  // SYSCALL_HALT
      state.status = STATUS_HALTED;
    }
    default: {}
  }
  
  vm_states[vm_id] = state;
}
```

**Performance**: ~0.01ms for 100 VMs (memory operations may have higher latency).

---

## Control Flow

### Loops

Loops are implemented as backward jumps. The scheduler continues executing VMs that jump backward.

**Example: Counting Loop**

```assembly
SETI r0, 0          # r0 = counter
SETI r1, 10         # r1 = limit

LOOP_START:         # Address 2
  LOAD r2, 5        # Some work
  ADD r2, r2, r0
  STORE r2, 5
  
  ADD r0, r0, 1     # Increment counter
  SUB r3, r1, r0    # r3 = limit - counter
  BRANCH_GT r3, LOOP_START  # If r3 > 0, goto LOOP_START
  
HALT
```

**Execution Pattern**:
- Epoch 1: All VMs execute addresses 0-1 (SETI)
- Epoch 2: All VMs execute addresses 2-7 (loop body + branch)
- Epoch 3: VMs with r3 > 0 jump to address 2; others continue to HALT
- Epochs 4-N: Progressively fewer VMs in loop as counters reach limit

### Nested Loops

```assembly
SETI r0, 0          # i = 0 (outer)
SETI r1, 5          # outer_limit

OUTER_LOOP:
  SETI r2, 0        # j = 0 (inner)
  SETI r3, 3        # inner_limit
  
  INNER_LOOP:
    MUL r4, r0, r2  # Work: r4 = i * j
    STORE r4, 10
    
    ADD r2, r2, 1   # j++
    SUB r4, r3, r2
    BRANCH_GT r4, INNER_LOOP
  
  ADD r0, r0, 1     # i++
  SUB r4, r1, r0
  BRANCH_GT r4, OUTER_LOOP

HALT
```

### Function Calls

Functions use a global call stack managed by the branch kernel.

**Call Stack Structure**:

```wgsl
struct CallFrame {
  vm_id: u32,
  return_ip: u32,
  saved_registers: array<f32, 4>,
}

@group(0) @binding(X) var<storage, read_write> call_stack: array<CallFrame>;
@group(0) @binding(Y) var<storage, read_write> call_stack_top: atomic<u32>;
```

**Example: Function Call**

```assembly
SETI r0, 5
SETI r1, 7
CALL multiply_func  # Saves return address, jumps to function
STORE r0, 15        # Result stored after return
HALT

multiply_func:      # Address 10
  MUL r0, r0, r1    # r0 = r0 * r1
  RETURN            # Restores caller state, returns
```

**Execution Trace**:
1. VM executes SETI instructions (linear kernel)
2. VM executes CALL (branch kernel saves context, jumps to address 10)
3. VM executes MUL (oracle kernel)
4. VM executes RETURN (branch kernel restores context, returns to address 3)
5. VM executes STORE (linear kernel)
6. VM executes HALT (I/O kernel marks as halted)

### Calling Conventions

Three options for register preservation:

#### 1. Caller-Save (No Preservation)
- CALL: Don't save registers
- RETURN: Don't restore registers
- Caller responsible for saving important values to memory before CALL
- Fastest, but requires manual management

#### 2. Callee-Save (Full Preservation)
- CALL: Save all registers to stack
- RETURN: Restore all registers from stack
- Callee modifications don't affect caller
- Safest, but more expensive

#### 3. Hybrid (Recommended)
- CALL: Save r0-r1 (argument/return registers)
- Callee can freely modify r2-r3 (scratch registers)
- Return value in r0
- Balanced performance and safety

---

## Execution Model

### Epoch-Based Execution

The system executes in discrete epochs, where each epoch processes all active VMs through one instruction.

```typescript
class GPUVMCluster {
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
    
    // 5. Update scheduler state (check for halted/yielded VMs)
    await this.updateSchedulerState();
  }
  
  async run(maxEpochs: number = 10000): Promise<void> {
    for (let epoch = 0; epoch < maxEpochs; epoch++) {
      // Check if all VMs are halted
      if (this.activeVMCount === 0) {
        console.log(`All VMs completed at epoch ${epoch}`);
        break;
      }
      
      await this.executeEpoch();
      
      // Wake yielded VMs
      this.checkYieldedVMs();
    }
  }
}
```

### Scheduler State Management

```typescript
enum VMStatus {
  RUNNING = 0,
  BLOCKED = 1,
  YIELDED = 2,
  HALTED = 3,
}

class VMScheduler {
  private activeVMs: Set<number> = new Set();
  private yieldedVMs: Map<number, number> = new Map();  // vm_id → epoch_count
  private haltedVMs: Set<number> = new Set();
  
  async updateSchedulerState(): Promise<void> {
    // Read VM statuses from GPU
    const statuses = await this.readVMStatuses();
    
    for (let vm_id = 0; vm_id < statuses.length; vm_id++) {
      const status = statuses[vm_id];
      
      switch (status) {
        case VMStatus.RUNNING:
          // Continue in next epoch
          break;
          
        case VMStatus.YIELDED:
          // Move to yielded queue with epoch counter
          this.yieldedVMs.set(vm_id, 0);
          this.activeVMs.delete(vm_id);
          break;
          
        case VMStatus.HALTED:
          // Remove from all queues
          this.haltedVMs.add(vm_id);
          this.activeVMs.delete(vm_id);
          this.yieldedVMs.delete(vm_id);
          break;
          
        case VMStatus.BLOCKED:
          // Handle I/O blocking (check completion)
          if (this.ioComplete(vm_id)) {
            statuses[vm_id] = VMStatus.RUNNING;
            this.activeVMs.add(vm_id);
          }
          break;
      }
    }
    
    // Write updated statuses back to GPU
    await this.writeVMStatuses(statuses);
  }
  
  checkYieldedVMs(): void {
    // Wake VMs that have yielded for at least one epoch
    for (const [vm_id, count] of this.yieldedVMs) {
      if (count >= 1) {
        this.activeVMs.add(vm_id);
        this.yieldedVMs.delete(vm_id);
        // Mark as RUNNING in GPU memory
        this.setVMStatus(vm_id, VMStatus.RUNNING);
      } else {
        this.yieldedVMs.set(vm_id, count + 1);
      }
    }
  }
}
```

### Branch Divergence Handling

When VMs take different branch paths, they naturally separate into different execution groups:

```
Initial state: 1000 VMs at instruction 5 (BRANCH_GT r0, 20)

Classification Result:
- 1000 VMs in branch_indices[]

After Branch Resolution:
- 600 VMs: IP = 20 (branch taken)
- 400 VMs: IP = 6 (fall through)

Next Epoch Classification:
- VMs at IP=20 classified together
- VMs at IP=6 classified together
- No divergence within each group!

This continues until paths converge or VMs halt.
```

**Key Insight**: Thread divergence is eliminated because VMs executing different instructions are processed in separate kernel invocations.

---

## Performance Characteristics

### Scalability Analysis

#### Single VM (CPU Baseline)

```
Per instruction:
- Matrix multiply 22×22: ~0.001ms
- Oracle operation: ~0.0001ms
- Branch evaluation: ~0.00005ms

100 instructions: ~0.1ms
```

#### 1000 VMs (GPU Batched)

```
Per epoch (all VMs execute one instruction):
- Classification: ~0.01ms
- Linear kernel (600 VMs): ~0.05ms
- Oracle kernel (300 VMs): ~0.02ms
- Branch kernel (50 VMs): ~0.01ms
- I/O kernel (50 VMs): ~0.01ms

Total per epoch: ~0.10ms
```

**Speedup Analysis**:
- 1000 VMs × 100 instructions = 100,000 instruction executions
- Sequential: 100,000 × 0.001ms = 100ms
- Parallel: 100 epochs × 0.10ms = 10ms
- **Effective speedup: 10x**

**Throughput**:
- 1000 VMs × 100 instructions / 10ms = **10 million instructions per second**

### Memory Efficiency

```
Per VM:
- State vector: 88 bytes
- Metadata: 40 bytes
- Total: 128 bytes (aligned)

1000 VMs: 128KB (easily fits in GPU cache)
10,000 VMs: 1.28MB
100,000 VMs: 12.8MB
```

### Instruction Distribution Impact

Typical program composition affects performance:

```
Program A (Numerical):
- 70% linear operations
- 20% oracle operations
- 10% branches

Epoch time: 0.05 * 0.7 + 0.02 * 0.2 + 0.01 * 0.1 = 0.04ms

Program B (Control-Heavy):
- 30% linear operations
- 30% oracle operations
- 40% branches

Epoch time: 0.05 * 0.3 + 0.02 * 0.3 + 0.02 * 0.4 = 0.029ms
```

**Observation**: Programs with more linear operations take longer per epoch but exhibit better parallelism.

### Loop Performance

A loop with N iterations requires approximately N epochs:

```
Loop: 10 iterations × 5 instructions = 50 instruction executions
Epochs: ~10 (one per iteration)
Time: 10 × 0.1ms = 1ms

1000 VMs with same loop:
- Still ~10 epochs
- All VMs progress together
- Total time: ~1ms (same as single VM!)
- Effective throughput: 1000 × 50 / 1ms = 50M instructions/sec
```

---

## Limitations and Trade-offs

### Current Limitations

#### 1. Fixed Memory Addresses

**Limitation**: VM memory (16 locations) can only be accessed with compile-time constant addresses.

**Reason**: Dynamic addressing requires non-linear operations (array indexing), which cannot be expressed as matrix transformations.

**Workaround**: Use shared memory (via syscalls) for dynamic addressing.

**Example**:
```assembly
# This works (compile-time address):
LOAD r0, 5

# This doesn't work (runtime address):
# LOAD r0, [r1]  ← Not supported

# Workaround using shared memory:
SYSCALL_READ r0, r1  # Read from shared_memory[r1]
```

#### 2. Small Register Count

**Limitation**: Only 4 general-purpose registers.

**Impact**: Complex expressions require spilling to memory.

**Reason**: More registers increase state vector size (22 → 26+ floats), which increases matrix size (484 → 676+ floats), reducing cache efficiency.

**Trade-off**: 4 registers balances expressiveness vs. memory footprint.

#### 3. Small VM Memory

**Limitation**: Only 16 memory locations per VM.

**Impact**: Limited local storage for variables, arrays, stack.

**Reason**: Memory is part of state vector; more memory = larger matrices.

**Workaround**: Use shared memory for large data structures.

#### 4. Loop Latency

**Limitation**: Loops require multiple epochs (one per iteration).

**Impact**: Latency for single-VM execution is higher than traditional VMs.

**Mitigation**: Massive parallelism compensates - 1000 VMs achieve 1000x throughput.

**Example**:
```
Traditional VM: 10-iteration loop = 10 instructions = 0.01ms
Linear Algebra VM: 10-iteration loop = 10 epochs = 1ms

But with 1000 VMs:
Traditional VM: 1000 × 0.01ms = 10ms (sequential)
Linear Algebra VM: 10 epochs × 0.1ms = 1ms (parallel)
```

#### 5. No Indirect Function Calls

**Limitation**: CALL instruction requires compile-time target address.

**Reason**: Similar to memory addressing - dynamic targets require non-linear resolution.

**Workaround**: Use jump tables with branches:

```assembly
# Indirect call via jump table
CMP r0, 0
BRANCH_EQ r0, func_0
CMP r0, 1
BRANCH_EQ r0, func_1
# ... etc
```

### Design Trade-offs

#### Linear Operations vs. Flexibility

**Choice**: Maximize linear operations (60-80% of instructions).

**Benefit**: Zero thread divergence, perfect GPU utilization.

**Cost**: Limited expressiveness (no dynamic addressing, no computed jumps).

**Verdict**: Appropriate for data-parallel workloads with regular access patterns.

#### Matrix Size vs. State Capacity

**Choice**: 22-element state vector (4 registers, 16 memory).

**Benefit**: 484-float matrices fit in GPU cache.

**Cost**: Limited local storage per VM.

**Alternative**: 32-element state (8 registers, 24 memory) → 1024-float matrices → 2x memory, worse cache behavior.

**Verdict**: 22 elements balances cache efficiency and expressiveness.

#### Epoch-Based Execution vs. Asynchronous

**Choice**: Synchronous epochs (barrier after each instruction).

**Benefit**: Simple scheduling, predictable behavior, coherent execution.

**Cost**: Fast VMs wait for slow VMs within an epoch.

**Alternative**: Asynchronous execution (VMs proceed independently) → complex dependency tracking, potential race conditions.

**Verdict**: Epoch-based execution is simpler and sufficient for most workloads.

---

## Use Cases and Applications

### Ideal Workloads

#### 1. Embarrassingly Parallel Computations

**Characteristics**:
- Many independent tasks
- Minimal inter-task communication
- Regular control flow

**Examples**:
- Monte Carlo simulations (each VM runs one trial)
- Ray tracing (each VM traces one ray)
- Batch image processing (each VM processes one pixel/image)
- Parameter sweeps (each VM tests one parameter combination)

**Performance**: Excellent - near-linear scaling with VM count.

#### 2. Agent-Based Simulations

**Characteristics**:
- Many autonomous agents
- Local interactions
- Simple agent logic

**Examples**:
- Flocking/swarming behaviors
- Cellular automata
- Traffic simulations
- Epidemiological models

**Performance**: Good - occasional shared memory access for neighbor queries.

#### 3. Numerical Computing

**Characteristics**:
- Matrix operations
- Element-wise transformations
- Reduction operations

**Examples**:
- Linear algebra operations
- Scientific simulations
- Data analytics
- Signal processing

**Performance**: Excellent - linear operations dominate.

#### 4. Shader-Like Operations

**Characteristics**:
- Per-element computation
- Minimal branching
- Texture/data lookups

**Examples**:
- Image filters
- Pixel shaders
- Post-processing effects

**Performance**: Excellent - maps naturally to VM model.

### Challenging Workloads

#### 1. Irregular Control Flow

**Characteristics**:
- Heavy branching
- Data-dependent execution paths
- Nested conditionals

**Challenge**: Branch divergence separates VMs into many small groups, reducing parallelism.

**Mitigation**: Restructure algorithms to minimize branches (e.g., use arithmetic instead of conditionals).

#### 2. Dynamic Data Structures

**Characteristics**:
- Pointer chasing
- Linked lists, trees
- Dynamic memory allocation

**Challenge**: No indirect addressing in VM memory; requires shared memory with runtime addressing overhead.

**Mitigation**: Use shared memory for complex structures; keep VM memory for scratch space.

#### 3. Recursive Algorithms

**Characteristics**:
- Unbounded call depth
- Variable execution time
- Stack-intensive

**Challenge**: Call stack grows unbounded; different VMs may have vastly different recursion depths.

**Mitigation**: Convert to iterative algorithms when possible; limit recursion depth.

#### 4. I/O-Intensive Tasks

**Characteristics**:
- Frequent external memory access
- Inter-VM communication
- Synchronization requirements

**Challenge**: I/O kernel may become bottleneck; shared memory bandwidth limits.

**Mitigation**: Minimize syscalls; batch I/O operations; use local VM memory when possible.

---

## Implementation Guide

### Compiler Design

#### Program Representation

```typescript
interface Program {
  instructions: Instruction[];
  matrices: Float32Array;  // Only for linear ops
  metadata: ProgramMetadata;
}

interface Instruction {
  opcode: number;
  operands: [number, number, number, number];
}

interface ProgramMetadata {
  entryPoint: number;
  linearInstructionCount: number;
  estimatedEpochs: number;
  memoryRequirements: {
    vmMemory: number;      // Locations used in VM memory
    sharedMemory: number;  // Bytes needed in shared memory
    callStackDepth: number; // Maximum call depth
  };
}
```

#### Matrix Generation

For linear operations, generate transformation matrices:

```typescript
function compileLinearInstruction(inst: Instruction): Float32Array {
  const matrix = createIdentityMatrix(22);  // Start with identity
  
  switch (inst.opcode) {
    case Opcode.ADD: {
      const [dest, src1, src2] = inst.operands;
      // Row for dest register: copy from src1 and src2
      matrix[row(dest + 1)][col(src1 + 1)] = 1.0;
      matrix[row(dest + 1)][col(src2 + 1)] = 1.0;
      break;
    }
    
    case Opcode.SETI: {
      const [dest, immediate] = inst.operands;
      // Row for dest register: copy from homogeneous coordinate scaled
      matrix[row(dest + 1)][col(21)] = immediate;
      break;
    }
    
    case Opcode.LOAD: {
      const [dest, addr] = inst.operands;
      // Row for dest register: copy from memory[addr]
      matrix[row(dest + 1)][col(5 + addr)] = 1.0;
      break;
    }
    
    // ... similar for other linear operations
  }
  
  // Increment IP (always for linear ops)
  matrix[0][0] = 1.0;   // Keep current IP
  matrix[0][21] = 1.0;  // Add 1 from homogeneous coordinate
  
  return matrix.flatten();
}

function row(index: number): number {
  return index;
}

function col(index: number): number {
  return index;
}
```

### Runtime Implementation

#### GPU Buffer Allocation

```typescript
class GPURuntime {
  private device: GPUDevice;
  private buffers: {
    vmStates: GPUBuffer;
    program: GPUBuffer;
    matrices: GPUBuffer;
    sharedMemory: GPUBuffer;
    callStack: GPUBuffer;
    classification: GPUBuffer;
    linearIndices: GPUBuffer;
    oracleIndices: GPUBuffer;
    branchIndices: GPUBuffer;
    ioIndices: GPUBuffer;
  };
  
  async initialize(numVMs: number, program: Program): Promise<void> {
    // Allocate VM states (128 bytes each)
    this.buffers.vmStates = this.device.createBuffer({
      size: numVMs * 128,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    
    // Allocate program instructions
    this.buffers.program = this.device.createBuffer({
      size: program.instructions.length * 20,  // 20 bytes per instruction
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    // Allocate transformation matrices
    this.buffers.matrices = this.device.createBuffer({
      size: program.matrices.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    // Allocate shared memory
    this.buffers.sharedMemory = this.device.createBuffer({
      size: program.metadata.memoryRequirements.sharedMemory,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    
    // Allocate call stack
    const maxCallFrames = numVMs * program.metadata.memoryRequirements.callStackDepth;
    this.buffers.callStack = this.device.createBuffer({
      size: maxCallFrames * 32,  // 32 bytes per frame
      usage: GPUBufferUsage.STORAGE,
    });
    
    // Allocate classification buffers
    const classificationSize = numVMs * 4;  // 4 bytes per index
    this.buffers.linearIndices = this.createBuffer(classificationSize);
    this.buffers.oracleIndices = this.createBuffer(classificationSize);
    this.buffers.branchIndices = this.createBuffer(classificationSize);
    this.buffers.ioIndices = this.createBuffer(classificationSize);
    
    this.buffers.classification = this.device.createBuffer({
      size: 16,  // 4 atomic counters
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    
    // Upload program data
    await this.uploadProgram(program);
  }
}
```

#### Kernel Pipeline

```typescript
class ExecutionPipeline {
  async executeEpoch(): Promise<void> {
    // Reset classification counters
    await this.resetClassification();
    
    // 1. Classification pass
    const classifyPass = this.device.createComputePassEncoder();
    classifyPass.setPipeline(this.pipelines.classification);
    classifyPass.setBindGroup(0, this.bindGroups.classification);
    classifyPass.dispatchWorkgroups(Math.ceil(this.numVMs / 256));
    classifyPass.end();
    
    // Submit and wait
    this.device.queue.submit([classifyPass.finish()]);
    await this.device.queue.onSubmittedWorkDone();
    
    // 2. Read classification results
    const counts = await this.readClassificationCounts();
    
    // 3. Execute kernels in parallel
    const executionPass = this.device.createComputePassEncoder();
    
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
    this.device.queue.submit([executionPass.finish()]);
    await this.device.queue.onSubmittedWorkDone();
  }
}
```

---

## Future Extensions

### Potential Enhancements

#### 1. Sparse Matrix Optimization

**Observation**: Most transformation matrices are sparse (many zeros).

**Optimization**: Use sparse matrix formats (CSR, COO) to reduce memory footprint and improve cache efficiency.

**Benefit**: 5-10x reduction in matrix storage; faster matrix-vector multiply.

#### 2. Mixed Precision

**Idea**: Use FP16 for some operations where full FP32 precision isn't needed.

**Benefit**: 2x throughput for FP16 operations; reduced memory bandwidth.

**Challenge**: Maintaining accuracy for accumulations and comparisons.

#### 3. Predication for Branches

**Idea**: Instead of branching, use predicated execution (both paths computed, results selected).

**Benefit**: Reduces branch divergence; keeps VMs synchronized.

**Cost**: Wasted computation on untaken path.

**Use Case**: Short branch bodies with balanced path probability.

#### 4. Larger State Vectors

**Idea**: Support 32 or 64-element state vectors for more registers/memory.

**Benefit**: More expressive VM; fewer memory spills.

**Cost**: Larger matrices (1024 or 4096 floats); worse cache behavior.

**Trade-off**: Application-dependent - useful for complex per-VM logic.

#### 5. Dynamic VM Allocation

**Idea**: Spawn/kill VMs during execution (e.g., for particle systems, tree traversal).

**Implementation**: Add SPAWN and KILL syscalls; maintain free VM pool.

**Benefit**: More flexible for dynamic workloads.

**Challenge**: Managing VM lifecycle; load balancing.

---

## Conclusion

This GPU-accelerated virtual machine architecture demonstrates that significant portions of program execution can be expressed as linear transformations, enabling massive parallelization. The hybrid approach - using pure linear algebra for transformations and specialized kernels for non-linear operations - maintains computational accuracy while preserving the benefits of the linear formulation.

The five-kernel design eliminates thread divergence for the majority of operations, resulting in efficient GPU utilization. This makes the architecture suitable for applications requiring thousands of concurrent VM instances with regular access patterns and moderate control flow complexity.

**Key Strengths**:
- Massive parallelism (1000+ VMs simultaneously)
- Memory efficiency (128 bytes per VM)
- Zero divergence for linear operations (60-80% of typical programs)
- Exact computation (no approximation errors)

**Best Applications**:
- Embarrassingly parallel computations
- Agent-based simulations
- Numerical computing with regular patterns
- Shader-like data transformations

**Limitations**:
- Fixed memory addressing
- Small register/memory capacity per VM
- Loop latency (multiple epochs per iteration)
- No indirect function calls

The architecture is particularly effective for workloads where many VMs execute similar code paths, linear operations dominate, and massive parallelism is more valuable than single-VM latency.