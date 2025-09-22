
import { MAX_LOOPS } from '../Constants.js'
import {
    SCAN, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    EQZ, ANY,
    TRUE, FALSE,
} from '../ISA.js'

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
        toArray  : function () { return stack.map((e) => e[1]) },
        height   : function () { return stack.length },

        rhs      : function () { return stack.at(0)?.at(1) },
        lhs      : function () { return stack.at(1)?.at(1) },

        pop      : function ()     { stack.shift() },
        push     : function (n, v) { stack.unshift([n, v]) },

        unop     : function (n, v) { this.pop(); this.push(n, v) },
        binop    : function (n, v) { this.pop(); this.pop(); this.push(n, v) },
    };
}

// -----------------------------------------------------------------------------

export function *run (name, program, DEBUG) {

    let [ state, pc, ip, shadow ] = [ SCAN, 0, 0, initShadowStack() ]

    // execute until we hit the end, or an error
    while (state != HALT && state != ERR) {

        // -------------------------------------------------------------------------
        // Decode the instruction
        // -------------------------------------------------------------------------
        let instruction = program[ip];
        let [ st, op, data, tm, retain ] = instruction;

        // loop local variables
        let temp;

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
                tm = shadow.rhs() == 0 ? tm : 1;
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
                shadow.push(pc, temp);
                break;
            case DUP:
                // simply duplicate the previous stack value
                temp = shadow.rhs();
                shadow.push(pc, temp);
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
            case NEG: temp = -(shadow.rhs()); shadow.unop(pc, temp); break;
            case ADD: temp = shadow.lhs() + shadow.rhs(); shadow.binop(pc, temp); break;
            case SUB: temp = shadow.lhs() - shadow.rhs(); shadow.binop(pc, temp); break;
            case MUL: temp = shadow.lhs() * shadow.rhs(); shadow.binop(pc, temp); break;
            case DIV: temp = shadow.lhs() / shadow.rhs(); shadow.binop(pc, temp); break;
            case MOD: temp = shadow.lhs() % shadow.rhs(); shadow.binop(pc, temp); break;
            // ----------------------------------------------
            // comparison ...
            // ----------------------------------------------
            case EQ: temp = shadow.lhs() == shadow.rhs() ? TRUE : FALSE; shadow.binop(pc, temp); break;
            case NE: temp = shadow.lhs() != shadow.rhs() ? TRUE : FALSE; shadow.binop(pc, temp); break;
            case LT: temp = shadow.lhs() <  shadow.rhs() ? TRUE : FALSE; shadow.binop(pc, temp); break;
            case LE: temp = shadow.lhs() <= shadow.rhs() ? TRUE : FALSE; shadow.binop(pc, temp); break;
            case GT: temp = shadow.lhs() >  shadow.rhs() ? TRUE : FALSE; shadow.binop(pc, temp); break;
            case GE: temp = shadow.lhs() >= shadow.rhs() ? TRUE : FALSE; shadow.binop(pc, temp); break;
            // ----------------------------------------------
            // logical ...
            // ----------------------------------------------
            case NOT: temp = shadow.rhs() ? TRUE : FALSE; shadow.unop(pc, temp); break;
            case AND: temp = shadow.lhs() && shadow.rhs() ? TRUE : FALSE; shadow.binop(pc, temp); break;
            case OR:  temp = shadow.lhs() || shadow.rhs() ? TRUE : FALSE; shadow.binop(pc, temp); break;
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
        yield [ temp, st, pc, ip, instruction, shadow ];

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

