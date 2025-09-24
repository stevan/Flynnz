
import {
    SCAN, COMM, JUMP, HALT, ERR,
    TRUE, FALSE,

    Instruction,
    OperationalState,
    TapeMovement,
    Immediate,

} from '../../ISA'


export type StackValue   = [ number, Immediate ];
export type MachineStack = StackValue[];

export type MachineStateSnapshot  = {
    state : OperationalState,
    pc    : number,
    ip    : number,
    stack : Immediate[]
}

export class MachineState {

    constructor(
        public state : OperationalState,
        public pc    : number,
        public ip    : number,
        public stack : MachineStack,
    ) {}

    static initialState () : MachineState {
        return new MachineState(SCAN, 0, 0, [])
    }

    // -------------------------------------------------------------------------

    advance (nextState : OperationalState, tapeMovement : TapeMovement) : MachineStateSnapshot {
        let prev : MachineStateSnapshot = {
            state : this.state,
            ip    : this.ip,
            pc    : this.pc,
            stack : this.stack.map((p) => p[0])
        };

        this.state = nextState;
        this.ip   += tapeMovement;
        this.pc   += 1;

        return prev;
    }

    // -------------------------------------------------------------------------

    isRunning () : boolean { return this.state != HALT && this.state != ERR }
    isHalted  () : boolean { return this.state == HALT }
    hasError  () : boolean { return this.state == ERR  }

    checkIfZero () : boolean {
        let [ idx, value ] = this.stack.pop() as StackValue;
        return value == FALSE ? true : false;
    }

    getValueAtTOS () : Immediate {
        let [ idx, top ] = this.stack[ this.stack.length - 1 ] as StackValue;
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

    PUSH (value : Immediate) : Immediate {
        this.stack.push([ this.pc, value ] as StackValue);
        return value;
    }

    DUP () : Immediate { return this.PUSH(this.getValueAtTOS()) }

    BINOP (f : (n : Immediate, m: Immediate) => Immediate) : Immediate {
        let [ ridx, rhs ] = this.stack.pop() as StackValue;
        let [ lidx, lhs ] = this.stack.pop() as StackValue;
        return this.PUSH( f( lhs, rhs ) );
    }

    UNOP (f : (n : Immediate) => Immediate) : Immediate {
        let [ ridx, rhs ] = this.stack.pop() as StackValue;
        return this.PUSH( f( rhs ) );
    }

    // these just re-arrange (or remove)
    // so no index updates, just local moves

    POP () : void { this.stack.pop() }

    SWAP () : void {
        let x = this.stack[ this.stack.length - 2 ] as StackValue;
        let y = this.stack[ this.stack.length - 1 ] as StackValue;
        this.stack[ this.stack.length - 1 ] = x;
        this.stack[ this.stack.length - 2 ] = y;
    }

    ROT () : void {
        let x = this.stack[ this.stack.length - 3 ] as StackValue;
        let y = this.stack[ this.stack.length - 2 ] as StackValue;
        let z = this.stack[ this.stack.length - 1 ] as StackValue;
        this.stack[ this.stack.length - 1 ] = y;
        this.stack[ this.stack.length - 2 ] = x;
        this.stack[ this.stack.length - 3 ] = z;
    }
}
