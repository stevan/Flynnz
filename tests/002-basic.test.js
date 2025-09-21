
const MAX_LOOPS = 64;

const fmt = (n, w = 2, s = '0') => (n == null ? 'NULL' : n.toString()).padStart(w, s)

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
    const ANY = 'ANY';

const HALT = 'HALT';

// 1) state
// 1) operation
// 2) tape move
// 3) sp move
// 4) tos move
// ?) store to heap?

let program1 = [
    [ SCAN, 2,      1,  1  ],
    [ SCAN, DUP,    1,  1  ],
    [ SCAN, ADD,    1,  1  ],
    [ JUMP, ___,   -2,  0  ],
    [ HALT, ___,    0,  0  ],
];

let program = [
    [ SCAN,  10,    1,  1  ],
    [ SCAN,  DUP,   1,  1  ],
    [ SCAN,  1,     1,  1  ],
    [ SCAN,  SUB,   1,  1  ],
    [ SCAN,  DUP,   1,  1  ],
    [ SCAN,  1,     1,  1  ],
    [ SCAN,  EQ,    1,  1  ],
    [ JUMP,  EQZ,  -6, -3  ],
    [ HALT,  ___,   0,  0  ],
];

// system state
let state = SCAN;
let pc    = 0;
let ip    = 0;
let tos   = -1;

// the output we produce
let output = [];

while (state != HALT && pc < MAX_LOOPS) {
    // allocate a temp ...
    let temp;

    // -------------------------------------------------------------------------
    // Decode the instruction
    // -------------------------------------------------------------------------
    let [ st, op, tm, tosm ] = program[ip];

    //console.log('INSTRUCTION', program[ip]);

    // -------------------------------------------------------------------------
    // Apply state changes (other than SCAN)
    // -------------------------------------------------------------------------
    switch (st) {
    case HALT:
        // the next loop will halt the system
        break;
    case JUMP:
        switch (op) {
        case ANY:
            // unconditional jump, just goto the IP based on TM
            break;
        case EQZ:
            tm = output[tos][0] == 0 ? tm : 1;
            // conditional jump, just goto the IP if zero
            temp = output[tos + tosm][0];
            //console.log(tos, tosm, output[tos + tosm]);
            tosm = 1;
            //console.log(output);
            //throw new Error("FUCK");
            break;
        }
        break;
    case SCAN:
        // -------------------------------------------------------------------------
        // Perform the operation
        // -------------------------------------------------------------------------
        switch (op) {
        // stack ops ...
        case DUP:
            // simply duplicate the previous stack value
            temp = output[tos][0];
            break;
        case POP:
            // duplicate the value which would have been TOS if pop-ed for real
            // NOTE: this should work, haven't tested it yet ;)
            temp = output[tos - 1][0];
            break;
        // TODO: SWAP? ROT? can they be done?
        // math ...
        case NEG: temp = -(output[tos][0]); break;
        case ADD: temp = output[tos - 1][0] + output[tos][0]; break;
        case SUB: temp = output[tos - 1][0] - output[tos][0]; break;
        case MUL: temp = output[tos - 1][0] * output[tos][0]; break;
        case DIV: temp = output[tos - 1][0] / output[tos][0]; break;
        case MOD: temp = output[tos - 1][0] % output[tos][0]; break;
        // comparison ...
        case EQ: temp = output[tos - 1][0] == output[tos][0] ? TRUE : FALSE; break;
        case NE: temp = output[tos - 1][0] != output[tos][0] ? TRUE : FALSE; break;
        case LT: temp = output[tos - 1][0] <  output[tos][0] ? TRUE : FALSE; break;
        case LE: temp = output[tos - 1][0] <= output[tos][0] ? TRUE : FALSE; break;
        case GT: temp = output[tos - 1][0] >  output[tos][0] ? TRUE : FALSE; break;
        case GE: temp = output[tos - 1][0] >= output[tos][0] ? TRUE : FALSE; break;
        // logical ...
        case NOT: temp = output[tos][0] ? TRUE : FALSE; break;
        case AND: temp = output[tos - 1][0] && output[tos][0] ? TRUE : FALSE; break;
        case OR:  temp = output[tos - 1][0] || output[tos][0] ? TRUE : FALSE; break;
        default:
            // if it is none of these, then it is likely to be a number
            // so we can just "push" that into the stack by passing it
            // through to the output
            temp = op;
        }
        break;
    default:
        // if we don't know the state, then we should halt and complain!
        st = HALT;
        console.log(`Unknown state(${st}) - HALTING!`);
        continue;
    }

    switch (st) {
    case HALT:
        console.log('-'.repeat(60));
        console.log(`${fmt(pc, 4)} HALT [      ] [      ] IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        break;
    case JUMP:
        console.log('-'.repeat(60));
        console.log(`${fmt(pc, 4)} JUMP [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        console.log('-'.repeat(60));
        break;
    case SCAN:
        console.log(`${fmt(pc, 4)} SCAN [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        break;
    }

    // -------------------------------------------------------------------------
    // Write to the output, if the ic has changed
    // -------------------------------------------------------------------------
    output[pc] = [ temp, op, state, pc, ip, tos ];

    // -------------------------------------------------------------------------
    // Update system loop state
    // -------------------------------------------------------------------------
    state = st;
    pc    = pc  + 1;
    ip    = ip  + tm;
    tos   = tos + tosm;

    // go around the loop again ...
}

console.table([['STACK', 'OP', 'STATE', 'PC', 'IP', 'TOS'], ...output]);

