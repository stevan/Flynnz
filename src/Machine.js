
import { MAX_LOOPS } from '../src/Constants.js'
import {
    SCAN, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    EQZ, ANY,
    TRUE, FALSE,
} from '../src/ISA.js'

export function initShadowStack () {
    // keep a shadow stack of indicies
    // of things in the output log so
    // that we can always easily get
    // the current stack values without
    // needing to do fancy indexing
    // stuff that always ends up hurting
    // my brain
    let stack = [];
    return {
        toArray  : function () { return stack },
        height   : function () { return stack.length },
        rhs      : function () { return stack.at(0) },
        lhs      : function () { return stack.at(1) },
        pop      : function ()  { stack.shift() },
        push     : function (n) { return stack.unshift(n) },
        unop     : function (n) { this.pop(); this.push(n) },
        binop    : function (n) { this.pop(); this.pop(); this.push(n) },
    };
}

export function initOutputLog () {
    return [];
}

export function runProgram (name, program, DEBUG) {
    // initialize system state
    let state = SCAN;
    let pc    = 0;
    let ip    = 0;
    let tos   = 0;

    // allocate the output log
    let output = initOutputLog();
    let shadow = initShadowStack();

    if (DEBUG) DEBUG.displayRuntimeHeader(name);

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
        if (DEBUG) DEBUG.displayMachineState(pc, ip, st, op, tos, temp, shadow);

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

    if (DEBUG) DEBUG.displayRuntimeFooter();

    return output;
}

