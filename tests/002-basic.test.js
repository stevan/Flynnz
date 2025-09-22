
import { MAX_LOOPS, ___, TRUE, FALSE, } from '../src/Constants.js'
import * as Debugger from '../src/Debugger.js'

import {
    SCAN, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    EQZ, ANY,
} from '../src/ISA.js'

// -----------------------------------------------------------------------------
// Instructions
// -----------------------------------------------------------------------------
// 1) machine state to transition to
// 2) machine operation to perform
// 3) immediate data needed for the op
// 4) direction and distance of next tape move
// 6) keep value for the heap?
// -----------------------------------------------------------------------------

let powersOfTwo = [ // result should be 2 -> 256 by powers of 2
    [ SCAN, PUSH,   2,  1, TRUE  ],
    [ SCAN, DUP,  ___,  1, FALSE ],
    [ SCAN, ADD,  ___,  1, FALSE ],
    [ SCAN, DUP,  ___,  1, TRUE  ],
    [ SCAN, PUSH, 256,  1, FALSE ],
    [ SCAN, EQ,   ___,  1, FALSE ],
    [ JUMP, EQZ,  ___, -5, FALSE ],
    [ HALT, ___,  ___,  0, FALSE ],
];

let countdown = [ // result should be 10 -> 1 range
    [ SCAN,  PUSH,  10,  1, TRUE,   ],
    [ SCAN,  DUP,  ___,  1, FALSE,  ],
    [ SCAN,  PUSH,   1,  1, FALSE,  ],
    [ SCAN,  SUB,  ___,  1, TRUE,   ],
    [ SCAN,  DUP,  ___,  1, FALSE,  ],
    [ SCAN,  PUSH,   1,  1, FALSE,  ],
    [ SCAN,  EQ,   ___,  1, FALSE,  ],
    [ JUMP,  EQZ,  ___, -6, FALSE,  ],
    [ HALT,  ___,  ___,  0, FALSE,  ],
];

let popTest = [ // result should be 8
    [ SCAN, PUSH,   5,  1, FALSE ],
    [ SCAN, PUSH,   3,  1, FALSE ],
    [ SCAN, PUSH,  10,  1, FALSE ],
    [ SCAN, POP,  ___,  1, FALSE ],
    [ SCAN, ADD,  ___,  1, TRUE  ],
    [ HALT, ___,  ___,  0, FALSE ],
];

// -----------------------------------------------------------------------------
// Machine
// -----------------------------------------------------------------------------

// load the programs and run them all ...
[
    [ 'popTest',     popTest     ],
    [ 'powersOfTwo', powersOfTwo ],
    [ 'countdown',   countdown   ],
].forEach((exe) => {

let [ name, program ] = exe;

Debugger.displayProgram(name, program);

// initialize system state
let state = SCAN;
let pc    = 0;
let ip    = 0;
let tos   = 0;

// allocate the output log
let output = [];

// keep a shadow stack of indicies
// of things in the output log so
// that we can always easily get
// the current stack values without
// needing to do fancy indexing
// stuff that always ends up hurting
// my brain
let sstack = [];
let shadow = {
    height   : function () { return sstack.length },
    rhs      : function () { return sstack.at(0) },
    lhs      : function () { return sstack.at(1) },
    pop      : function ()  { sstack.shift() },
    push     : function (n) { return sstack.unshift(n) },
    unop     : function (n) { this.pop(); this.push(n) },
    binop    : function (n) { this.pop(); this.pop(); this.push(n) },
};

Debugger.displayRuntimeHeader(name);

// execute until we hit the end, or an error
while (state != HALT && state != ERR) {
    // loop local variables
    let temp;

    // -------------------------------------------------------------------------
    // Decode the instruction
    // -------------------------------------------------------------------------
    let [ st, op, data, tm, retain ] = program[ip];

    //console.log('INSTRUCTION', program[ip]);

    let rhs = shadow.rhs();
    let lhs = shadow.lhs();

    //console.log('rhs', rhs, 'lhs', lhs, 'shadow', sstack.join(', '));

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
            tm = output[rhs][0] == 0 ? tm : 1;
            // no matter what, copy the TOS to the
            // output, but do not actually alter
            // the TOS state here, that happens
            // below, and will cancel out any
            // negative values since it should
            // really always be one, and these
            // negative numbers are only allowed
            // for jumps as a means of carrying
            // over the values to the next loop
            shadow.pop();
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
        // POP  (    n --       )
        case PUSH:
            temp = data;
            shadow.push(tos);
            break;
        case DUP:
            // simply duplicate the previous stack value
            temp = output[rhs][0];
            shadow.push(tos);
            break;
        case POP:
            shadow.pop();
            break;
        // ----------------------------------------------
        // TODO:
        // ----------------------------------------------
        // SWAP (   a b -- b a   )
        // ROT  ( a b c -- c b a )
        // ----------------------------------------------

        // ----------------------------------------------
        // maths ...
        // ----------------------------------------------
        case NEG: temp = -(output[rhs][0]); shadow.unop(tos); break;
        case ADD: temp = output[lhs][0] + output[rhs][0]; shadow.binop(tos); break;
        case SUB: temp = output[lhs][0] - output[rhs][0]; shadow.binop(tos); break;
        case MUL: temp = output[lhs][0] * output[rhs][0]; shadow.binop(tos); break;
        case DIV: temp = output[lhs][0] / output[rhs][0]; shadow.binop(tos); break;
        case MOD: temp = output[lhs][0] % output[rhs][0]; shadow.binop(tos); break;
        // ----------------------------------------------
        // comparison ...
        // ----------------------------------------------
        case EQ: temp = output[lhs][0] == output[rhs][0] ? TRUE : FALSE; shadow.binop(tos); break;
        case NE: temp = output[lhs][0] != output[rhs][0] ? TRUE : FALSE; shadow.binop(tos); break;
        case LT: temp = output[lhs][0] <  output[rhs][0] ? TRUE : FALSE; shadow.binop(tos); break;
        case LE: temp = output[lhs][0] <= output[rhs][0] ? TRUE : FALSE; shadow.binop(tos); break;
        case GT: temp = output[lhs][0] >  output[rhs][0] ? TRUE : FALSE; shadow.binop(tos); break;
        case GE: temp = output[lhs][0] >= output[rhs][0] ? TRUE : FALSE; shadow.binop(tos); break;
        // ----------------------------------------------
        // logical ...
        // ----------------------------------------------
        case NOT: temp = output[rhs][0] ? TRUE : FALSE; shadow.unop(tos); break;
        case AND: temp = output[lhs][0] && output[rhs][0] ? TRUE : FALSE; break;
        case OR:  temp = output[lhs][0] || output[rhs][0] ? TRUE : FALSE; break;
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
    Debugger.displayMachineState(pc, ip, st, op, tos, temp, sstack);

    // -------------------------------------------------------------------------
    // Write to the output
    // -------------------------------------------------------------------------
    output[tos] = [ temp, tos, rhs, lhs, st, op, ip, retain ];

    // -------------------------------------------------------------------------
    // Update system loop state
    // -------------------------------------------------------------------------
    state = st;
    ip   += tm;
    pc   += 1;
    tos  += 1;
    // -------------------------------------------------------------------------

    // go around the loop again, but
    // check the max loops for sanity
    if (pc >= MAX_LOOPS) break;
}

Debugger.displayRuntimeFooter();
Debugger.displayProgramResults(name, output);


}); // end the programs loop - DO NOT REMOVE
