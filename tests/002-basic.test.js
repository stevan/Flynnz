
const MAX_LOOPS = 64

const fmt = (n, w = 2, s = '0') => n.toString().padStart(w, s)

const ___ = null;

const TRUE  = 1;
const FALSE = 0;

const SCAN = 'SCAN';
    const DUP = 'DUP';
    const POP = 'POP';

    const NEG = 'NEG'
    const ADD = 'ADD';
    const SUB = 'SUB';
    const MUL = 'MUL';
    const DIV = 'DIV';
    const MOD = 'MOD';

    const EQ = 'EQ';
    const NE = 'NE';
    const LT = 'LT';
    const LE = 'LE';
    const GT = 'GT';
    const GE = 'GE';

    const NOT = 'NOT';
    const AND = 'AND';
    const OR  = 'OR';

const JUMP  = 'JUMP';
    const EQZ = 'EQZ';
    const NEZ = 'NEZ';
    const ANY = 'ANY';

const HALT = 'HALT';

// 1) state
// 1) operation
// 2) tape move
// 3) stack adjust/move
// 4) retain value?

let program1 = [
    [ SCAN, 2,      1,  1, FALSE ],
    [ SCAN, DUP,    1,  1, FALSE ],
    [ SCAN, ADD,    1,  1, FALSE ],
    [ JUMP, ___,   -2,  0, FALSE ],
    [ HALT, ___,    0,  0, FALSE ],
];

let program = [
    [ SCAN,  10,    1,  1, TRUE  ],
    [ SCAN,  DUP,   1,  1, FALSE ],
    [ SCAN,  1,     1,  1, FALSE ],
    [ SCAN,  SUB,   1,  1, FALSE ],
    [ SCAN,  DUP,   1,  1, TRUE  ],
    [ SCAN,  1,     1,  1, FALSE ],
    [ SCAN,  EQ,    1,  1, FALSE ],
    [ JUMP,  EQZ,  -6, -3, FALSE ],
    [ HALT,  ___,   0,  1, FALSE ],
];

// system state
let state = SCAN
let pc    = 0;
let ip    = 0;
let sp    = 0;
let tos   = sp;

// the output we produce
let output = [];

while (state != HALT && pc < MAX_LOOPS) {
    // -------------------------------------------------------------------------
    // Decode the instruction
    // -------------------------------------------------------------------------
    // - Depends on the state of `ip`
    // - Does not change any other state
    // -------------------------------------------------------------------------
    // - system state
    // - operation to perform
    // - tape movement
    // - stack pointer movement
    // - keep the value in the output
    let [ st, op, tm, sm, keep ] = program[ip];

    // -------------------------------------------------------------------------
    // Apply state changes (other than SCAN)
    // -------------------------------------------------------------------------
    // The core thing this stage does is to cause the system to break linearity
    // by either halting or jumping. With the later, it's key function is to
    // adjust the `tos` state (as needed) so that the operations can find
    // values in the expected place.
    // -------------------------------------------------------------------------
    // - HALT : Depends on the `st` from the instruction
    // - HALT: Adjusts `state`
    // - JUMP: Depends on the `op`, `tm` and `sm` from the instruction
    // - JUMP: Adjusts `ip` and `tos` (but NOT the `sp`)
    // -------------------------------------------------------------------------
    // NOTE: the `ip` adjustment is not depended on after this because the
    // `continue` jumps us to the top of the loop. However, the `tos` adjustment
    // is very much depended on by the code below.
    // -------------------------------------------------------------------------
    switch (st) {
    case HALT:
        state = st;
        // the next loop will halt the system
        continue;
    case JUMP:
        switch (op) {
        case ANY:
            ip += tm;
            // unconditional jump, just goto the IP
            break;
        case EQZ:
            ip += output[sp][0] == 0 ? tm : 1
            // conditional jump, just goto the IP if zero
            break;
        case NEZ:
            ip += output[sp][0] != 0 ? tm : 1
            // conditional jump, just goto the IP if NOT zero
            break;
        }
        console.log(`JUMP [${fmt(op, 6, ' ')}] IP(${fmt(ip)}) SP(${fmt(sp)}) => TOS(${fmt(sp + sm)})`);
        // before we loop, do any stack pointer
        // adjustments to account for the loop
        tos += sm;
        continue;
    }

    // NOTE: States other than SCAN will all `continue` the `while`` loop,
    // jumping back to the top of the loop and then basically refetching the
    // instruction with updated instruction pointer (`ip`). So if execution
    // reaches this point it is a SCAN and we need to perform the operation.

    // -------------------------------------------------------------------------
    // Perform the operation
    // -------------------------------------------------------------------------
    // - Depends on the `op` of the decoded instruction
    // - Depends on the `tos` state variable (possibly altered above)
    //   but on the `tos`, and `tos - 1` only (binop or unop)
    // - Adjust the `result` value which gets written to the output
    // -------------------------------------------------------------------------
    // This uses the values in the output as the previous stack locations
    // and addresses them via the `tos` state variable which will always
    // point at the top of the stack for reading values, and it will return
    // the value in the `result` variable.
    let result;
    switch (op) {
    // stack ops ...
    case DUP:
        // simply duplicate the previous stack value
        result = output[tos][0];
        break;
    case POP:
        // duplicate the value which would have been TOS if pop-ed for real
        // NOTE: this should work, haven't tested it yet ;)
        result = output[tos - 1][0];
        break;
    // TODO: SWAP? ROT? can they be done?
    // math ...
    case NEG: result = -(output[tos][0]); break;
    case ADD: result = output[tos - 1][0] + output[tos][0]; break;
    case SUB: result = output[tos - 1][0] - output[tos][0]; break;
    case MUL: result = output[tos - 1][0] * output[tos][0]; break;
    case DIV: result = output[tos - 1][0] / output[tos][0]; break;
    case MOD: result = output[tos - 1][0] % output[tos][0]; break;
    // comparison ...
    case EQ: result = output[tos - 1][0] == output[tos][0] ? TRUE : FALSE; break;
    case NE: result = output[tos - 1][0] != output[tos][0] ? TRUE : FALSE; break;
    case LT: result = output[tos - 1][0] <  output[tos][0] ? TRUE : FALSE; break;
    case LE: result = output[tos - 1][0] <= output[tos][0] ? TRUE : FALSE; break;
    case GT: result = output[tos - 1][0] >  output[tos][0] ? TRUE : FALSE; break;
    case GE: result = output[tos - 1][0] >= output[tos][0] ? TRUE : FALSE; break;
    // logical ...
    case NOT: result = output[tos][0] ? TRUE : FALSE; break;
    case AND: result = output[tos - 1][0] && output[tos][0] ? TRUE : FALSE; break;
    case OR:  result = output[tos - 1][0] || output[tos][0] ? TRUE : FALSE; break;
    default:
        // if it is none of these, then it is likely to be a number
        // so we can just "push" that into the stack by passing it
        // through to the output
        result = op;
    }

    console.log(`${fmt(pc, 4)} [${fmt(op, 6, ' ')}] [${fmt(result, 6, ' ')}] IP(${fmt(ip)}) TOS(${fmt(tos)}) SP(${fmt(sp)})`);

    // -------------------------------------------------------------------------
    // Update system loop state
    // -------------------------------------------------------------------------
    // - Depends on the `sm` and `tm` from the instructions (unaltered)
    // - Adjusts the `sp` and `ip` states using them
    // - Adjusts the `pc` to keep track of how many instructions we have run
    // - Adjusts the `tos` by setting it to the new `sp`
    // -------------------------------------------------------------------------
    sp += sm;
    ip += tm;
    pc += 1;
    tos = sp;
    // write to output
    output[pc] = [ result, keep, state, ip, tos, sp ];
}

// show the values we want to keep
console.log(output.filter((log) => log[1] == TRUE));

