
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

struct Instruction {
  opcode: u32,
  operands: array<u32, 4>,  // Flexible: registers, addresses, immediates
}

struct MatrixMetadata {
  format: u32,      // 0 = sparse (CSR), 1 = dense
  offset: u32,      // Byte offset into respective buffer
  size: u32,        // Size in bytes
  non_zero_count: u32,  // Number of non-zero elements
}

struct SparseMatrix {
  // Stored contiguously in sparse_matrices buffer at offset
  values: array<f32>,       // Non-zero values
  col_indices: array<u32>,  // Column index for each value
  row_pointers: array<u32>, // Start index for each row (length = 23)
}
