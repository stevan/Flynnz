# VM Core Architecture

## Design Overview

Each VM instance is a minimal execution unit with:
- **4 general-purpose registers** (32 bits floating-point each)
- **16 memory locations** (32 bits floating-point each)
- **1 instruction pointer** (float for matrix operations, cast to integer for indexing)
- **Metadata** (VM ID, stack pointer, status flags)

VMs execute in lockstep within epochs, but can be at different instruction addresses (different routines).

## Harvard Architecture

**Instruction Storage**: Separate from VM memory
```
program[] array (read-only)
  └─ Contains all instructions for all routines
  └─ Accessed via instruction pointer (IP)
  └─ Never modified during execution

matrix_metadata[] array (read-only)
  └─ Per-instruction metadata: format type, offset, size
  └─ Indexed by IP

dense_matrices[] array (read-only)
  └─ Dense 22×22 transformation matrices
  └─ Only for instructions with ≥15% non-zeros
  └─ Indexed via matrix_metadata[ip].offset

sparse_matrices[] buffer (read-only)
  └─ Sparse matrix data (CSR format)
  └─ Values, column indices, row pointers
  └─ Indexed via matrix_metadata[ip].offset

vm_states[] array (read-write)
  └─ Contains state for each VM instance
  └─ Modified by kernel execution
```

**Benefit**: Enables pure functional transformations - instructions are immutable mathematical operators.

---
