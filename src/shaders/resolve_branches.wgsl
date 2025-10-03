

@compute @workgroup_size(256)
fn resolve_branches(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= classification.branch_count) { return; }

  let vm_id = branch_indices[idx];
  var state = vm_states[vm_id];
  let ip = u32(state.IP);
  let inst = program[ip];

  var new_ip = ip + 1u;
  var should_branch = false;

  let condition_reg = inst.operands[0];
  let target_ip = inst.operands[1];
  let condition_value = state.registers[condition_reg];

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
    case 56u: {  // JUMP
      should_branch = true;
    }
    case 60u: {  // CALL
      let stack_idx = atomicAdd(&call_stack_top, 1u);
      call_stack[stack_idx].vm_id = vm_id;
      call_stack[stack_idx].return_ip = ip + 1u;
      for (var i = 0u; i < 4u; i++) {
        call_stack[stack_idx].saved_registers[i] = state.registers[i];
      }
      state.stack_pointer = stack_idx;
      should_branch = true;
    }
    case 61u: {  // RETURN
      let stack_idx = state.stack_pointer;
      let frame = call_stack[stack_idx];
      new_ip = frame.return_ip;
      for (var i = 0u; i < 4u; i++) {
        state.registers[i] = frame.saved_registers[i];
      }
      call_stack[stack_idx].vm_id = 0xFFFFFFFFu;
      should_branch = false;
    }
    default: {}
  }

  if (should_branch) {
    new_ip = target_ip;
  }

  state.IP = f32(new_ip);
  vm_states[vm_id] = state;
}
