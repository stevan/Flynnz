
import { MAX_LOOPS } from './Constants.js'
import {
    SCAN, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    EQZ, ANY,
    TRUE, FALSE,
} from './ISA.js'

// -----------------------------------------------------------------------------

function initShadowStack () {
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

function initOutputLog () {
    return [];
}

// -----------------------------------------------------------------------------

export function *run (name, program, DEBUG) {
    // initialize system state
    let state = SCAN;
    let pc    = 0;
    let ip    = 0;

    // allocate the output log
    let output = initOutputLog();
    let shadow = initShadowStack();

    // execute until we hit the end, or an error
    while (state != HALT && state != ERR) {

        // -------------------------------------------------------------------------
        // Decode the instruction
        // -------------------------------------------------------------------------
        let instruction = program[ip];
        let [ st, op, data, tm, retain ] = instruction;

        // loop local variables
        let temp;
        let rhs = shadow.rhs();
        let lhs = shadow.lhs();

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
                shadow.push(pc);
                break;
            case DUP:
                // simply duplicate the previous stack value
                temp = output[rhs][0];
                shadow.push(pc);
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
            case NEG: temp = -(output[rhs][0]); shadow.unop(pc); break;
            case ADD: temp = output[lhs][0] + output[rhs][0]; shadow.binop(pc); break;
            case SUB: temp = output[lhs][0] - output[rhs][0]; shadow.binop(pc); break;
            case MUL: temp = output[lhs][0] * output[rhs][0]; shadow.binop(pc); break;
            case DIV: temp = output[lhs][0] / output[rhs][0]; shadow.binop(pc); break;
            case MOD: temp = output[lhs][0] % output[rhs][0]; shadow.binop(pc); break;
            // ----------------------------------------------
            // comparison ...
            // ----------------------------------------------
            case EQ: temp = output[lhs][0] == output[rhs][0] ? TRUE : FALSE; shadow.binop(pc); break;
            case NE: temp = output[lhs][0] != output[rhs][0] ? TRUE : FALSE; shadow.binop(pc); break;
            case LT: temp = output[lhs][0] <  output[rhs][0] ? TRUE : FALSE; shadow.binop(pc); break;
            case LE: temp = output[lhs][0] <= output[rhs][0] ? TRUE : FALSE; shadow.binop(pc); break;
            case GT: temp = output[lhs][0] >  output[rhs][0] ? TRUE : FALSE; shadow.binop(pc); break;
            case GE: temp = output[lhs][0] >= output[rhs][0] ? TRUE : FALSE; shadow.binop(pc); break;
            // ----------------------------------------------
            // logical ...
            // ----------------------------------------------
            case NOT: temp = output[rhs][0] ? TRUE : FALSE; shadow.unop(pc); break;
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
        // Write to the output
        // -------------------------------------------------------------------------
        output[pc] = [ temp, st, pc, ip, instruction, shadow ];
        yield output[pc];

        // -------------------------------------------------------------------------
        // Update system loop state
        // -------------------------------------------------------------------------
        state = st;
        pc   += 1;
        ip   += tm;
        // -------------------------------------------------------------------------

        // go around the loop again, but
        // check the max loops for sanity
        if (pc >= MAX_LOOPS) break;
    }
}

