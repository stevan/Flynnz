

@compute @workgroup_size(256)
fn io_scheduler(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= classification.io_count) { return; }

  let vm_id = io_indices[idx];
  var state = vm_states[vm_id];
  let ip = u32(state.IP);
  let inst = program[ip];

  let operand0 = inst.operands[0];
  let operand1 = inst.operands[1];

  switch (inst.opcode) {
    case 30u: {  // SYSCALL_READ
      let addr = u32(state.registers[operand1]);
      state.registers[operand0] = shared_memory[addr];
      state.IP += 1.0;
    }
    case 31u: {  // SYSCALL_WRITE
      let addr = u32(state.registers[operand0]);
      shared_memory[addr] = state.registers[operand1];
      state.IP += 1.0;
    }
    case 32u: {  // SYSCALL_VMID
      state.registers[operand0] = f32(state.vm_id);
      state.IP += 1.0;
    }
    case 33u: {  // SYSCALL_YIELD
      state.status = STATUS_YIELDED;
    }
    case 34u: {  // SYSCALL_HALT
      state.status = STATUS_HALTED;
    }
    default: {}
  }

  vm_states[vm_id] = state;
}
