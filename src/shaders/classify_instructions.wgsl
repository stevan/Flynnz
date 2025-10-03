
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
  if (state.status != STATUS_RUNNING) { return; }

  let ip = u32(state.IP);
  let inst = program[ip];

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
