
const MAX_LOOPS = 64;

const fmt = (n, w = 2, s = '0') => (n == null ? 'NULL' : n.toString()).padStart(w, s)

// -----------------------------------------------------------------------------
// Useful constants
// -----------------------------------------------------------------------------

const ___ = null;

const TRUE  = 1;
const FALSE = 0;

// -----------------------------------------------------------------------------
// Instruction Set
// -----------------------------------------------------------------------------

const SCAN = 'SCAN';
    const PUSH = 'PUSH';
    const DUP  = 'DUP';
    const POP  = 'POP';

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
const ERR  = 'ERR';

// -----------------------------------------------------------------------------
// Instructions
// -----------------------------------------------------------------------------
// 1) machine state to transition to
// 2) machine operation to perform
// 3) direction and distance of next tape move
// 4) top-of-stack tracker
// -----------------------------------------------------------------------------
// 1. Machine State Transiton
//
// -----------------------------------------------------------------------------
// 2. Machine Operation
//
// -----------------------------------------------------------------------------
// 3. Tape Direction & Distance
//
// -----------------------------------------------------------------------------
// 4. Top Of Stack tracker
//
// -----------------------------------------------------------------------------


let powersOfTwo = [
    [ SCAN, PUSH,   2,  1,  1  ],
    [ SCAN, DUP,  ___,  1,  1  ],
    [ SCAN, ADD,  ___,  1,  1  ],
    [ JUMP, ANY,  ___, -2,  0  ],
    [ HALT, ___,  ___,  0,  0  ],
];

let countdown = [
    [ SCAN,  PUSH,  10,  1,  1, TRUE,   ],
    [ SCAN,  DUP,  ___,  1,  1, FALSE,  ],
    [ SCAN,  PUSH,   1,  1,  1, FALSE,  ],
    [ SCAN,  SUB,  ___,  1,  1, FALSE,  ],
    [ SCAN,  DUP,  ___,  1,  1, TRUE,   ],
    [ SCAN,  PUSH,   1,  1,  1, FALSE,  ],
    [ SCAN,  EQ,   ___,  1,  1, FALSE,  ],
    [ JUMP,  EQZ,  ___, -6, -3, FALSE,  ],
    [ HALT,  ___,  ___,  0,  0, FALSE,  ],
];

// -----------------------------------------------------------------------------
// Machine
// -----------------------------------------------------------------------------

let program = countdown;

// system state
let state = SCAN;
let pc    = 0;
let ip    = 0;
let tos   = -1;

// the output we produce
let output = [];

while (state != HALT && state != ERR && pc < MAX_LOOPS) {
    // allocate a temp ...
    let temp;

    // -------------------------------------------------------------------------
    // Decode the instruction
    // -------------------------------------------------------------------------
    let [ st, op, data, tm, tosm, retain ] = program[ip];

    //console.log('INSTRUCTION', program[ip]);

    // -------------------------------------------------------------------------
    // Apply state changes
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
            // conditional jump, just goto the IP if zero
            tm = output[tos][0] == 0 ? tm : 1;
            // no matter what, copy the TOS to the
            // output, but do not actually alter
            // the TOS state here, that happens
            // below, and will cancel out any
            // negative values since it should
            // really always be one, and these
            // negative numbers are only allowed
            // for jumps as a means of carrying
            // over the values to the next loop
            temp = output[tos + tosm][0];
            break;
        default:
            // if we don't know the op, then we should halt and complain!
            st = ERR;
            console.log(`ERROR: Unknown JUMP Operation(${op}) - HALTING!`);
            continue;
        }
        break;
    case SCAN:
        // -------------------------------------------------------------------------
        // Perform the operation
        // -------------------------------------------------------------------------
        switch (op) {
        // stack ops ...
        case PUSH:
            temp = data;
            break;
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
            // if we don't know the op, then we should halt and complain!
            st = ERR;
            console.log(`ERROR: Unknown SCAN Operation(${op}) - HALTING!`);
            continue;
        }
        break;
    default:
        // if we don't know the state, then we should halt and complain!
        st = ERR;
        console.log(`ERROR: Unknown Machine state(${st}) - HALTING!`);
        continue;
    }

    // -------------------------------------------------------------------------
    // Send information to the console about what we are doing
    // -------------------------------------------------------------------------
    switch (st) {
    case HALT:
        console.log('-'.repeat(44));
        console.log(`${fmt(pc, 4)} HALT! @ IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        break;
    case ERR:
        console.log('!'.repeat(44));
        console.log(`${fmt(pc, 4)} ERROR @ IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        break;
    case JUMP:
        console.log('-'.repeat(44));
        console.log(`${fmt(pc, 4)} JUMP [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        console.log('-'.repeat(44));
        break;
    case SCAN:
        console.log(`${fmt(pc, 4)} SCAN [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        break;
    }

    // -------------------------------------------------------------------------
    // Write to the output
    // -------------------------------------------------------------------------
    output[pc] = [ temp, retain, ip, op, state ];

    // -------------------------------------------------------------------------
    // Update system loop state
    // -------------------------------------------------------------------------
    state = st;
    pc    = pc  + 1;
    ip    = ip  + tm;
    tos   = tos + Math.max(1, tosm);

    // go around the loop again ...
}

console.log('+-------+--------+--------+--------+--------+--------+');
console.log('|    PC |   HEAP |  STACK |     IP |     OP |  STATE |');
console.log('+-------+--------+--------+--------+--------+--------+');
output.filter((row) => row[1] == TRUE).forEach((row, idx) => {
    console.log('|' + [ idx, ...row ].map((v) => fmt(v, 6, ' ')).join(' | ') + ' |')
});
console.log('+-------+--------+--------+--------+--------+--------+');

