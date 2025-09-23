
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

class MachineState {
    state;
    pc;
    ip;
    stack;

    constructor(state, pc, ip, stack) {
        this.state = state;
        this.pc    = pc;
        this.ip    = ip;
        this.stack = stack;
    }

    static initialState () {
        return new MachineState(SCAN, 0, 0, [])
    }

    // -------------------------------------------------------------------------

    isRunning () { return this.state != HALT && this.state != ERR }
    isHalted  () { return this.state == HALT }
    hasError  () { return this.state == ERR  }

    advance (nextState, tapeMovement) {
        this.state = nextState;
        this.ip   += tapeMovement;
        this.pc   += 1;
    }

    checkIfZero () {
        let [ idx, value ] = this.stack.pop();
        return value == FALSE ? true : false;
    }

    rhsIndex () { return this.stack[ this.stack.length - 1 ]?.at(0) }
    lhsIndex () { return this.stack[ this.stack.length - 2 ]?.at(0) }

    stackValues () { return this.stack.map((p) => p[1]) }

    // -------------------------------------------------------------------------
    // Stack Operations
    // -------------------------------------------------------------------------

    // PUSH  (      -- n      )
    // POP   (    n --        )
    // DUP   (    n -- n n    )
    // SWAP  (   a b -- b a   )
    // ROT   ( a b c -- c b a )
    // BINOP (   a b -- c     )
    // UNOP  (     a -- b     )

    // these produce new values, so they will return them
    // so they can be stored as a temp in the loop

    PUSH (value) {
        this.stack.push([ this.pc, value ]);
        return value;
    }

    DUP  () {
        let [ idx, top ] = this.stack[ this.stack.length - 1 ];
        this.PUSH(top);
        return top;
    }

    BINOP (f) {
        let [ ridx, rhs ] = this.stack.pop();
        let [ lidx, lhs ] = this.stack.pop();
        return this.PUSH( f( lhs, rhs ) );
    }

    UNOP (f) {
        let [ ridx, rhs ] = this.stack.pop();
        return this.PUSH( f( rhs ) );
    }

    // these just re-arrange (or remove)
    // so no index updates, just local moves

    POP  () { this.stack.pop() }

    SWAP () {
        let x = this.stack[ this.stack.length - 2 ];
        let y = this.stack[ this.stack.length - 1 ];
        this.stack[ this.stack.length - 1 ] = x;
        this.stack[ this.stack.length - 2 ] = y;
    }
    ROT () {
        let x = this.stack[ this.stack.length - 3 ];
        let y = this.stack[ this.stack.length - 2 ];
        let z = this.stack[ this.stack.length - 1 ];
        this.stack[ this.stack.length - 1 ] = y;
        this.stack[ this.stack.length - 2 ] = x;
        this.stack[ this.stack.length - 3 ] = z;
    }
}

// -----------------------------------------------------------------------------

export function *run (program) {

    let machine = MachineState.initialState();

    // execute until we hit the end, or an error
    while (machine.isRunning()) {

        // ---------------------------------------------------------------------
        // Decode the instruction
        // ---------------------------------------------------------------------
        let instruction = program[machine.ip];
        let [ st, op, data, tm, retain ] = instruction;

        let temp;

        // ---------------------------------------------------------------------
        // Apply state changes
        // ---------------------------------------------------------------------
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
                tm = machine.checkIfZero() ? tm : 1;
                break;
            default:
                // if we don't know the op, then we should halt and complain!
                st = ERR;
                //op = INVALID_JUMP_OP;
                break;
            }
            break;
        case SCAN:
            // -----------------------------------------------------------------
            // Perform the operation
            // -----------------------------------------------------------------
            switch (op) {
            // ----------------------------------------------
            // stack ops ...
            // ----------------------------------------------
            // adds new values, so returns new temp
            case PUSH : temp = machine.PUSH(data); break;
            case DUP  : temp = machine.DUP();      break;
            // just alters the stack, no temp needed
            case POP  : machine.POP();  break;
            case SWAP : machine.SWAP(); break;
            case ROT  : machine.ROT();  break;
            // ----------------------------------------------
            // maths ...
            // ----------------------------------------------
            case NEG: temp = machine.UNOP((x) => -x); break;
            case ADD: temp = machine.BINOP((n, m) => n + m ); break;
            case SUB: temp = machine.BINOP((n, m) => n - m ); break;
            case MUL: temp = machine.BINOP((n, m) => n * m ); break;
            case DIV: temp = machine.BINOP((n, m) => n / m ); break;
            case MOD: temp = machine.BINOP((n, m) => n % m ); break;
            // ----------------------------------------------
            // comparison ...
            // ----------------------------------------------
            case EQ: temp = machine.BINOP((n, m) => n == m ? TRUE : FALSE); break;
            case NE: temp = machine.BINOP((n, m) => n != m ? TRUE : FALSE); break;
            case LT: temp = machine.BINOP((n, m) => n <  m ? TRUE : FALSE); break;
            case LE: temp = machine.BINOP((n, m) => n <= m ? TRUE : FALSE); break;
            case GT: temp = machine.BINOP((n, m) => n >  m ? TRUE : FALSE); break;
            case GE: temp = machine.BINOP((n, m) => n >= m ? TRUE : FALSE); break;
            // ----------------------------------------------
            // logical ...
            // ----------------------------------------------
            case NOT: temp = machine.UNOP((x) => x ? TRUE : FALSE); break;
            case AND: temp = machine.BINOP((n, m) => n && m ? TRUE : FALSE); break;
            case OR:  temp = machine.BINOP((n, m) => n || m ? TRUE : FALSE); break;
            // ----------------------------------------------
            default:
                // if we don't know the op, then we should halt and complain!
                st = ERR;
                //op = INVALID_SCAN_OP;
                break;
            }
            break;
        default:
            // if we don't know the state, then we should halt and complain!
            st = ERR;
            //op = INVALID_STATE;
            break;
        }

        // ---------------------------------------------------------------------
        // Write to the output
        // ---------------------------------------------------------------------
        yield [ temp, st, instruction, machine ]

        // ---------------------------------------------------------------------
        // Update system loop state
        // ---------------------------------------------------------------------
        machine.advance(st, tm);

        // go around the loop again, but
        // check the max loops for sanity
        if (machine.pc >= MAX_LOOPS) break;
    }
}

