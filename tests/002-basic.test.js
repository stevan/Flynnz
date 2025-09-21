
const MAX_LOOPS = 256;

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
    const SWAP = 'SWAP';
    const ROT  = 'ROT';

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

const ERR  = 'ERR';
    const INVALID_STATE     = 'INVALID M STATE';
    const INVALID_SCAN_OP   = 'INVALID SCAN OP';
    const INVALID_JUMP_OP   = 'INVALID JUMP OP';

const HALT = 'HALT';

// -----------------------------------------------------------------------------
// Instructions
// -----------------------------------------------------------------------------
// 1) machine state to transition to
// 2) machine operation to perform
// 3) immediate data needed for the op
// 4) direction and distance of next tape move
// 5) top-of-stack tracker
// 6) keep value for the heap?
// -----------------------------------------------------------------------------

let powersOfTwo = [
    [ SCAN, PUSH,   2,  1,  1, FALSE ],
    [ SCAN, DUP,  ___,  1,  1, FALSE ],
    [ SCAN, ADD,  ___,  1,  1, FALSE ],
    [ JUMP, ANY,  ___, -2,  0, FALSE ],
    [ HALT, ___,  ___,  0,  0, FALSE ],
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

let test = [
    [ SCAN, PUSH,   2,  1,  1, TRUE ],
    [ SCAN, DUP,  ___,  1,  1, TRUE ],
    [ SCAN, PUSH,   5,  1,  1, TRUE ],
    [ SCAN, POP,  ___,  1,  1, TRUE ],
    [ SCAN, ADD,  ___,  1,  1, TRUE ],
    [ HALT, ___,  ___,  0,  0, TRUE ],
];

// -----------------------------------------------------------------------------
// Machine
// -----------------------------------------------------------------------------

// initialize system state
let state = SCAN;
let pc    = 0;
let ip    = 0;
let tos   = -1;

// allocate the output log
let output = [];

// load the program
let program = test;

// execute until we hit the end, or an error
while (state != HALT && state != ERR) {
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
            op = INVALID_JUMP_OP;
            break;
        }
        break;
    case SCAN:
        // -------------------------------------------------------------------------
        // Perform the operation
        // -------------------------------------------------------------------------
        switch (op) {
        // ----------------------------------------------
        // stack ops ...
        // ----------------------------------------------
        // These are done and should be fine
        // ----------------------------------------------
        // PUSH (      -- n     )
        // DUP  (    n -- n n   )
        case PUSH:
            temp = data;
            break;
        case DUP:
            // simply duplicate the previous stack value
            temp = output[tos][0];
            break;
        // ----------------------------------------------
        // FIXME:
        // ----------------------------------------------
        // These are tricky because they require changing
        // the previous stack state, which we do not want
        // to do within the log, ... not sure how to do
        // it yet, so we leave this here.
        // ----------------------------------------------
        // POP  (     n --       )
        // SWAP (   a b -- b a   )
        // ROT  ( a b c -- c b a )
        // ----------------------------------------------
        case POP:
        case SWAP:
        case ROT:
            throw new Error(`TODO - ${op}`);
            break;
        // ----------------------------------------------
        // maths ...
        // ----------------------------------------------
        case NEG: temp = -(output[tos][0]); break;
        case ADD: temp = output[tos - 1][0] + output[tos][0]; break;
        case SUB: temp = output[tos - 1][0] - output[tos][0]; break;
        case MUL: temp = output[tos - 1][0] * output[tos][0]; break;
        case DIV: temp = output[tos - 1][0] / output[tos][0]; break;
        case MOD: temp = output[tos - 1][0] % output[tos][0]; break;
        // ----------------------------------------------
        // comparison ...
        // ----------------------------------------------
        case EQ: temp = output[tos - 1][0] == output[tos][0] ? TRUE : FALSE; break;
        case NE: temp = output[tos - 1][0] != output[tos][0] ? TRUE : FALSE; break;
        case LT: temp = output[tos - 1][0] <  output[tos][0] ? TRUE : FALSE; break;
        case LE: temp = output[tos - 1][0] <= output[tos][0] ? TRUE : FALSE; break;
        case GT: temp = output[tos - 1][0] >  output[tos][0] ? TRUE : FALSE; break;
        case GE: temp = output[tos - 1][0] >= output[tos][0] ? TRUE : FALSE; break;
        // ----------------------------------------------
        // logical ...
        // ----------------------------------------------
        case NOT: temp = output[tos][0] ? TRUE : FALSE; break;
        case AND: temp = output[tos - 1][0] && output[tos][0] ? TRUE : FALSE; break;
        case OR:  temp = output[tos - 1][0] || output[tos][0] ? TRUE : FALSE; break;
        // ----------------------------------------------
        default:
            // if we don't know the op, then we should halt and complain!
            st = ERR;
            op = INVALID_SCAN_OP;
            break;
        }
        break;
    default:
        // if we don't know the state, then we should halt and complain!
        st = ERR;
        op = INVALID_STATE;
        break;
    }

    // -------------------------------------------------------------------------
    // Send information to the console about what we are doing
    // -------------------------------------------------------------------------
    switch (st) {
    case HALT:
        console.log(`${fmt(pc, 4)} HALT [______] [______] IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        console.log('='.repeat(44));
        break;
    case ERR:
        console.log('!'.repeat(44));
        console.log(`${fmt(pc, 4)} ERR  [${fmt(op, 15, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        console.log('!'.repeat(44));
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
    output[pc] = [ temp, retain, ip, op, st ];

    // -------------------------------------------------------------------------
    // Update system loop state
    // -------------------------------------------------------------------------
    state = st;
    pc   += 1;
    ip   += tm;
    tos  += Math.max(1, tosm);
    // -------------------------------------------------------------------------

    // go around the loop again, but
    // check the max loops for sanity
    if (pc >= MAX_LOOPS) break;
}

console.log('+-------+--------+--------+--------+--------+--------+');
console.log('|    PC |   HEAP |  STACK |     IP |     OP |  STATE |');
console.log('+-------+--------+--------+--------+--------+--------+');
output.filter((row) => row[1] == TRUE).forEach((row, idx) => {
    console.log('|' + [ idx, ...row ].map((v) => fmt(v, 6, ' ')).join(' | ') + ' |')
});
console.log('+-------+--------+--------+--------+--------+--------+');

