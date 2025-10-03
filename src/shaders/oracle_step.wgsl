@compute @workgroup_size(256)
fn oracle_step(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let idx = global_id.x;
  if (idx >= classification.oracle_count) { return; }

  let vm_id = oracle_indices[idx];
  var state = vm_states[vm_id];
  let ip = u32(state.IP);
  let inst = program[ip];

  let dest = inst.operands[0];
  let src1 = inst.operands[1];
  let src2 = inst.operands[2];

  switch (inst.opcode) {
    case 10u: {  // MUL
      state.registers[dest] = state.registers[src1] * state.registers[src2];
    }
    case 11u: {  // DIV
      state.registers[dest] = state.registers[src1] / state.registers[src2];
    }
    case 12u: {  // MOD
      state.registers[dest] = state.registers[src1] % state.registers[src2];
    }
    case 13u: {  // CMP
      state.registers[dest] = state.registers[src1] - state.registers[src2];
    }
    case 14u: {  // MIN
      state.registers[dest] = min(state.registers[src1], state.registers[src2]);
    }
    case 15u: {  // MAX
      state.registers[dest] = max(state.registers[src1], state.registers[src2]);
    }
    case 16u: {  // ABS
      state.registers[dest] = abs(state.registers[src1]);
    }
    case 17u: {  // SQRT
      state.registers[dest] = sqrt(state.registers[src1]);
    }
    case 18u: {  // SIN
      state.registers[dest] = sin(state.registers[src1]);
    }
    case 19u: {  // COS
      state.registers[dest] = cos(state.registers[src1]);
    }
    case 20u: {  // MULI
      let immediate = bitcast<f32>(inst.operands[2]);
      state.registers[dest] = state.registers[src1] * immediate;
    }
    case 21u: {  // DIVI
      let immediate = bitcast<f32>(inst.operands[2]);
      state.registers[dest] = state.registers[src1] / immediate;
    }
    case 22u: {  // MODI
      let immediate = bitcast<f32>(inst.operands[2]);
      state.registers[dest] = state.registers[src1] % immediate;
    }
    case 23u: {  // CMPI
      let immediate = bitcast<f32>(inst.operands[2]);
      state.registers[dest] = state.registers[src1] - immediate;
    }
    default: {}
  }

  state.IP += 1.0;
  vm_states[vm_id] = state;
}
