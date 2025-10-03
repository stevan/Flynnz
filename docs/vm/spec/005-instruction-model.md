# Instruction Model

## Instruction Structure

All instructions are stored in a unified format:

```wgsl
struct Instruction {
  opcode: u32,
  operands: array<u32, 4>,  // Flexible: registers, addresses, immediates
}
```

**Size**: 20 bytes per instruction (5 × 4-byte values)

## Storage Layout

Instructions exist in multiple forms:

1. **Instruction Metadata** (`program: array<Instruction>`)
   - Compact representation: 20 bytes per instruction
   - Used by classification kernel to determine instruction type
   - Contains operand information for all instruction types
   - Indexed by IP: `inst = program[u32(state.IP)]`

2. **Matrix Metadata** (`matrix_metadata: array<MatrixMetadata>`)
   - Per-instruction metadata for linear operations
   - Format type (dense/sparse), offset, size, non-zero count
   - Indexed by IP: `meta = matrix_metadata[u32(state.IP)]`

3. **Dense Matrices** (`dense_matrices: array<f32>`)
   - Only for linear operations with ≥15% non-zeros
   - 22×22 = 484 floats per matrix
   - Indexed via: `offset = matrix_metadata[ip].offset`

4. **Sparse Matrices** (`sparse_matrices: buffer`)
   - Only for linear operations with <15% non-zeros
   - CSR format: values, column indices, row pointers
   - Indexed via: `offset = matrix_metadata[ip].offset`

## Opcode Categories

| Range  | Category              | Execution Kernel | Matrix? | Divergence |
|--------|-----------------------|------------------|---------|------------|
| 0-9    | Linear Operations     | Linear           | Yes     | None       |
| 10-19  | Oracle Operations     | Oracle           | No      | Minimal    |
| 20-29  | Oracle w/ Immediate   | Oracle           | No      | Minimal    |
| 30-49  | I/O Operations        | I/O              | No      | Some       |
| 50-69  | Branch Operations     | Branch           | No      | Expected   |
| 70-99  | Reserved (future)     | -                | -       | -          |

## Complete Instruction Set

### Linear Operations (0-9)

Pure linear transformations compiled to matrices (dense or sparse):

| Opcode | Mnemonic | Operands | Description | Typical Non-Zeros | Format |
|--------|----------|----------|-------------|-------------------|--------|
| 0 | `ADD r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 + r_s2` | ~40 | Sparse |
| 1 | `SUB r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 - r_s2` | ~40 | Sparse |
| 2 | `MOV r_d, r_s` | dest, src, -, - | `r_d = r_s` | ~24 | Sparse |
| 3 | `SETI r_d, imm` | dest, immediate, -, - | `r_d = imm` | ~24 | Sparse |
| 4 | `LOAD r_d, addr` | dest, address, -, - | `r_d = mem[addr]` | ~24 | Sparse |
| 5 | `STORE r_s, addr` | src, address, -, - | `mem[addr] = r_s` | ~24 | Sparse |
| 6 | `COPY mem_d, mem_s` | dest_addr, src_addr, -, - | `mem[d] = mem[s]` | ~23 | Sparse |
| 7 | `CLEAR r_d` | dest, -, -, - | `r_d = 0` | ~23 | Sparse |
| 8 | `NEG r_d, r_s` | dest, src, -, - | `r_d = -r_s` | ~24 | Sparse |
| 9 | `SCALE r_d, r_s, f` | dest, src, factor, - | `r_d = r_s * f` | ~24 | Sparse |

**Note**: All linear operations automatically increment IP by 1 in their matrix (row 0 has coefficient 1 for homogeneous coordinate).

### Oracle Operations (10-29)

Non-linear arithmetic requiring exact computation:

| Opcode | Mnemonic | Operands | Description |
|--------|----------|----------|-------------|
| 10 | `MUL r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 * r_s2` |
| 11 | `DIV r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 / r_s2` |
| 12 | `MOD r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 % r_s2` |
| 13 | `CMP r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = r_s1 - r_s2` |
| 14 | `MIN r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = min(r_s1, r_s2)` |
| 15 | `MAX r_d, r_s1, r_s2` | dest, src1, src2, - | `r_d = max(r_s1, r_s2)` |
| 16 | `ABS r_d, r_s` | dest, src, -, - | `r_d = abs(r_s)` |
| 17 | `SQRT r_d, r_s` | dest, src, -, - | `r_d = sqrt(r_s)` |
| 18 | `SIN r_d, r_s` | dest, src, -, - | `r_d = sin(r_s)` |
| 19 | `COS r_d, r_s` | dest, src, -, - | `r_d = cos(r_s)` |
| 20 | `MULI r_d, r_s, imm` | dest, src, immediate, - | `r_d = r_s * imm` |
| 21 | `DIVI r_d, r_s, imm` | dest, src, immediate, - | `r_d = r_s / imm` |
| 22 | `MODI r_d, r_s, imm` | dest, src, immediate, - | `r_d = r_s % imm` |
| 23 | `CMPI r_d, r_s, imm` | dest, src, immediate, - | `r_d = r_s - imm` |

### I/O Operations (30-49)

System calls for external memory access and VM control:

| Opcode | Mnemonic | Operands | Description |
|--------|----------|----------|-------------|
| 30 | `SYSCALL_READ r_d, r_a` | dest, addr_reg, -, - | `r_d = shared_memory[r_a]` |
| 31 | `SYSCALL_WRITE r_a, r_s` | addr_reg, src, -, - | `shared_memory[r_a] = r_s` |
| 32 | `SYSCALL_VMID r_d` | dest, -, -, - | `r_d = f32(vm_id)` |
| 33 | `SYSCALL_YIELD` | -, -, -, - | Suspend execution |
| 34 | `SYSCALL_HALT` | -, -, -, - | Stop execution |

### Branch Operations (50-69)

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
| 60 | `CALL tgt` | target_ip, -, -, - | Jump, save return address |
| 61 | `RETURN` | -, -, -, - | Return from function |

---
