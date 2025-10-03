# Memory Architecture

## Three-Tier Memory Model

### 1. VM Memory (Part of State Vector)

**Characteristics**:
- **Size**: 16 floats (64 bytes) per VM
- **Addressing**: Compile-time constants only
- **Access**: Via LOAD/STORE instructions (linear operations)
- **Scope**: Private to each VM instance
- **Performance**: Fastest (part of transformed state)

**Use Cases**: Loop counters, temporary values, function locals, small constants

### 2. Shared Memory (External Buffer)

**Characteristics**:
- **Size**: Configurable (typically MB-GB range)
- **Addressing**: Runtime values in registers
- **Access**: Via SYSCALL_READ/SYSCALL_WRITE (I/O operations)
- **Scope**: Shared across all VMs
- **Performance**: Slower (requires syscall overhead)

**Use Cases**: Input/output data, inter-VM communication, large datasets

### 3. Call Stack (External Buffer)

**Characteristics**:
- **Size**: Dynamic, one frame per active function call
- **Addressing**: Via stack_pointer metadata
- **Access**: Implicitly by CALL/RETURN (branch operations)
- **Scope**: Per-VM, but stored in shared structure
- **Performance**: Moderate (only accessed on CALL/RETURN)

**Use Cases**: Function return addresses, saved register state

## Complete Memory Layout (GPU)

```
┌────────────────────────────────────────┐
│  Instruction Metadata (Read-Only)     │
│  - program: array<Instruction>         │
│  - Size: 20 bytes × num_instructions   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Matrix Metadata (Read-Only)           │
│  - matrix_metadata: array<MatrixMeta>  │
│  - Size: 16 bytes × num_linear_inst    │
│  - Contains: format, offset, size, nnz │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Dense Matrices (Read-Only)            │
│  - dense_matrices: array<f32>          │
│  - Size: 484 floats per dense matrix   │
│  - ~5% of linear instructions          │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Sparse Matrices (Read-Only)           │
│  - sparse_matrices: buffer             │
│  - CSR format: values, indices, ptrs   │
│  - Size: ~200 bytes per sparse matrix  │
│  - ~95% of linear instructions         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  VM States (Read-Write)                │
│  - vm_states: array<VMState>           │
│  - Size: 128 bytes × num_vms           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Call Stack (Read-Write)               │
│  - call_stack: array<CallFrame>        │
│  - Size: 32 bytes × max_active_calls   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Shared Memory (Read-Write)            │
│  - shared_memory: array<f32>           │
│  - Size: Configurable (1MB - 1GB)      │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  Classification Buffers (Read-Write)   │
│  - linear_indices: array<u32>          │
│  - oracle_indices: array<u32>          │
│  - branch_indices: array<u32>          │
│  - io_indices: array<u32>              │
│  - Size: 4 bytes × num_vms × 4         │
└────────────────────────────────────────┘
```

---
