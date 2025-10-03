# State Representation

## VMState Structure

Each VM instance maintains state in two parts:

### 1. Transformation Vector (22 floats)

This vector participates in matrix multiplication operations:

```
[IP, r0, r1, r2, r3, mem0, mem1, ..., mem15, 1]
 │   └────┬────┘ └──────────┬──────────┘  │
 │        │                  │              │
 │        │                  │              └─ Homogeneous coordinate (constant 1.0)
 │        │                  └──────────────── 16 memory locations
 │        └─────────────────────────────────── 4 general-purpose registers
 └──────────────────────────────────────────── Instruction pointer (float for matrix ops)
```

**Size**: 22 floats × 4 bytes = 88 bytes per VM transformation vector

**Why Floating Point IP?**: The entire state vector undergoes matrix multiplication in the linear kernel. Matrix operations require uniform types (all floats). Linear transformations can increment IP: `new_IP = old_IP + 1.0`. The cost of casting (`u32(state.IP)` for indexing) is negligible compared to the benefit of pure linear algebra operations.

### 2. Metadata Structure (not in transformation vector)

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

---
