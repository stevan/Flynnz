

@group(0) @binding(0) var<storage, read_write> vm_states: array<VMState>;
@group(0) @binding(1) var<storage, read> matrix_metadata: array<MatrixMetadata>;
@group(0) @binding(2) var<storage, read> dense_matrices: array<f32>;
@group(0) @binding(3) var<storage, read> sparse_values: array<f32>;
@group(0) @binding(4) var<storage, read> sparse_col_indices: array<u32>;
@group(0) @binding(5) var<storage, read> sparse_row_pointers: array<u32>;
@group(0) @binding(6) var<storage, read> linear_indices: array<u32>;
@group(0) @binding(7) var<storage, read> classification: Classification;

const FORMAT_SPARSE: u32 = 0u;
const FORMAT_DENSE: u32 = 1u;

@compute @workgroup_size(256)
fn linear_step(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= classification.linear_count) { return; }

  let vm_id = linear_indices[idx];
  var state = vm_states[vm_id];
  let ip = u32(state.IP);

  // Get matrix metadata
  let meta = matrix_metadata[ip];

  // Pack state into vector
  var state_vec: array<f32, 22>;
  state_vec[0] = state.IP;
  for (var i = 0u; i < 4u; i++) {
    state_vec[i + 1u] = state.registers[i];
  }
  for (var i = 0u; i < 16u; i++) {
    state_vec[i + 5u] = state.memory[i];
  }
  state_vec[21] = 1.0;

  // Dispatch based on matrix format
  var new_state_vec: array<f32, 22>;

  if (meta.format == FORMAT_DENSE) {
    new_state_vec = dense_matmul(meta.offset, state_vec);
  } else {
    new_state_vec = sparse_matmul(meta.offset, state_vec);
  }

  // Unpack result
  state.IP = new_state_vec[0];
  for (var i = 0u; i < 4u; i++) {
    state.registers[i] = new_state_vec[i + 1u];
  }
  for (var i = 0u; i < 16u; i++) {
    state.memory[i] = new_state_vec[i + 5u];
  }

  vm_states[vm_id] = state;
}

fn dense_matmul(offset: u32, state_vec: array<f32, 22>) -> array<f32, 22> {
  var result: array<f32, 22>;

  // Matrix stored as flat array: 484 floats
  let matrix_start = offset / 4u;  // Convert byte offset to float index

  for (var row = 0u; row < 22u; row++) {
    var sum = 0.0;
    for (var col = 0u; col < 22u; col++) {
      sum += dense_matrices[matrix_start + row * 22u + col] * state_vec[col];
    }
    result[row] = sum;
  }

  return result;
}

fn sparse_matmul(offset: u32, state_vec: array<f32, 22>) -> array<f32, 22> {
  var result: array<f32, 22>;

  // Read row pointers (23 entries: one per row + end marker)
  let row_ptr_start = offset / 4u;  // Convert byte offset to u32 index

  for (var row = 0u; row < 22u; row++) {
    var sum = 0.0;

    // Get start and end indices for this row
    let row_start = sparse_row_pointers[row_ptr_start + row];
    let row_end = sparse_row_pointers[row_ptr_start + row + 1u];

    // Multiply non-zero elements
    for (var i = row_start; i < row_end; i++) {
      let col = sparse_col_indices[i];
      let value = sparse_values[i];
      sum += value * state_vec[col];
    }

    result[row] = sum;
  }

  return result;
}
