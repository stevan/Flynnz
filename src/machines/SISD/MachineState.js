
import { SCAN, COMM, JUMP, HALT, ERR, TRUE, FALSE, } from '../../ISA.js'

export class MachineState {
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

    // -------------------------------------------------------------------------

    static initialState () {
        return new MachineState(SCAN, 0, 0, [])
    }

    advance (nextState, tapeMovement) {
        this.state = nextState;
        this.ip   += tapeMovement;
        this.pc   += 1;
    }

    // -------------------------------------------------------------------------

    isRunning () { return this.state != HALT && this.state != ERR }
    isHalted  () { return this.state == HALT }
    hasError  () { return this.state == ERR  }

    checkIfZero () {
        let [ idx, value ] = this.stack.pop();
        return value == FALSE ? true : false;
    }

    rhsIndex () { return this.stack[ this.stack.length - 1 ]?.at(0) }
    lhsIndex () { return this.stack[ this.stack.length - 2 ]?.at(0) }

    stackValues () { return this.stack.map((p) => p[1]) }

    getValueAtTOS () {
        let [ idx, top ] = this.stack[ this.stack.length - 1 ];
        return top;
    }

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

    DUP  () { return this.PUSH(this.getValueAtTOS()) }

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
