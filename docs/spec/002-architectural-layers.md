# Architectural Layers

## Complete System Architecture

```
┌─────────────────────────────────────────────────┐
│   High-Level Language (Future Layer)            │
│   - Statements & Expressions                    │
│   - Functions & Closures                        │
│   - Data Flow Abstractions                      │
└──────────────┬──────────────────────────────────┘
               │ Compilation
               ↓
┌─────────────────────────────────────────────────┐
│   VM Program Library                            │
│   - Pre-compiled Routines                       │
│   - Specialized Variants                        │
│   - Communication Patterns                      │
│   - Matrix Format Metadata                      │
└──────────────┬──────────────────────────────────┘
               │ Execution Planning
               ↓
┌─────────────────────────────────────────────────┐
│   GPU Scheduler & Runtime                       │
│   - Batch Execution                             │
│   - Memory Management                           │
│   - Synchronization                             │
│   - Matrix Format Dispatch                      │
└──────────────┬──────────────────────────────────┘
               │ Linear Algebra
               ↓
┌─────────────────────────────────────────────────┐
│   GPU Kernels                                   │
│   - Linear Transformations (Hybrid)             │
│   - Oracle Operations                           │
│   - Branch Resolution                           │
│   - I/O & Scheduling                            │
└─────────────────────────────────────────────────┘
```

## Terminology Hierarchy

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
  └─ Matrix format: dense or sparse (compiler-selected)
  
Epoch
  └─ One execution step where all active VMs execute one instruction
  └─ Finest-grained synchronization unit
```

---
