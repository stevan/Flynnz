
import {
    Instruction,
    OperationalState,
    TapeMovement,
    Immediate,
} from './Bytecode';

import { IOChannel } from './IO/Channels'

const MAX_LOOPS = 256;

const TRUE  = 1;
const FALSE = 0;

export type MachineSnapshot  = {
    temp  : Temporary,
    instr : Instruction,
    state : OperationalState,
    pc    : number,
    ip    : number,
    stack : number[],
}

export type StackValue   = [ number, Immediate ];
export type MachineStack = StackValue[];

export type Temporary = Immediate | null

export class Machine {
    public state : OperationalState;
    public pc    : number;
    public ip    : number;
    public stack : MachineStack;

    constructor(
        public program  : Instruction[],
        public input    : IOChannel,
        public output   : IOChannel,
    ) {
        this.state = 'SCAN';
        this.pc    = 0;
        this.ip    = 0;
        this.stack = [];
    }

    static load (program : Instruction[], input? : IOChannel | number[]) : Machine {
        return new Machine(
            program,
            (input == undefined
                ? new IOChannel()
                : Array.isArray(input)
                    ? new IOChannel(...input)
                    : input),
            new IOChannel(),
        )
    }

    // -------------------------------------------------------------------------

    isRunning () : boolean { return this.state != 'HALT' && this.state != 'ERR' }
    isHalted  () : boolean { return this.state == 'HALT' }
    hasError  () : boolean { return this.state == 'ERR'  }

    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------

    *run () : Generator<MachineSnapshot, void, void> {
        while (this.isRunning()) {
            yield this.step();
            if (this.pc >= MAX_LOOPS) break; // FIXME: do this better
        }
    }

    step () : MachineSnapshot {
        // ---------------------------------------------------------------------
        // Decode the instruction
        // ---------------------------------------------------------------------
        let instruction = this.program[this.ip] as Instruction;
        let [ st, op, data, tm, retain ] = instruction;

        let temp : Temporary = null;

        // ---------------------------------------------------------------------
        // Apply state changes
        // ---------------------------------------------------------------------
        switch (st) {
        case 'HALT':
            // the next loop will halt the system
            break;
        case 'JUMP':
            switch (op) {
            case 'ANY':
                // unconditional jump, just goto the IP based on TM
                break;
            case 'EQZ':
                // conditional jump, just goto the IP if zero
                tm = this.checkIfZero() ? tm : 1;
                break;
            default:
                // if we don't know the op, then we should halt and complain!
                st = 'ERR';
                break;
            }
            break;
        case 'COMM':
            switch (op) {
            case 'GET':
                temp = this.PUSH(this.input.acceptValue() as Immediate);
                break;
            case 'PUT':
                temp = this.getValueAtTOS();
                this.output.appendValue(temp);
                break;
            default:
                // if we don't know the op, then we should halt and complain!
                st = 'ERR';
                break;
            }
            break;
        case 'SCAN':
            // -----------------------------------------------------------------
            // Perform the operation
            // -----------------------------------------------------------------
            switch (op) {
            // ----------------------------------------------
            // stack ops ...
            // ----------------------------------------------
            // adds new values, so returns new temp
            case 'PUSH' : temp = this.PUSH(data as Immediate); break;
            case 'DUP'  : temp = this.DUP(); break;
            // just alters the stack, no temp needed
            case 'POP'  : this.POP();  break;
            case 'SWAP' : this.SWAP(); break;
            case 'ROT'  : this.ROT();  break;
            // ----------------------------------------------
            // maths ...
            // ----------------------------------------------
            case 'NEG' : temp = this.UNOP((x) => -x); break;
            case 'ADD' : temp = this.BINOP((n, m) => n + m ); break;
            case 'SUB' : temp = this.BINOP((n, m) => n - m ); break;
            case 'MUL' : temp = this.BINOP((n, m) => n * m ); break;
            case 'DIV' : temp = this.BINOP((n, m) => n / m ); break;
            case 'MOD' : temp = this.BINOP((n, m) => n % m ); break;
            // ----------------------------------------------
            // comparison ...
            // ----------------------------------------------
            case 'EQ' : temp = this.BINOP((n, m) => n == m ? TRUE : FALSE); break;
            case 'NE' : temp = this.BINOP((n, m) => n != m ? TRUE : FALSE); break;
            case 'LT' : temp = this.BINOP((n, m) => n <  m ? TRUE : FALSE); break;
            case 'LE' : temp = this.BINOP((n, m) => n <= m ? TRUE : FALSE); break;
            case 'GT' : temp = this.BINOP((n, m) => n >  m ? TRUE : FALSE); break;
            case 'GE' : temp = this.BINOP((n, m) => n >= m ? TRUE : FALSE); break;
            // ----------------------------------------------
            // logical ...
            // ----------------------------------------------
            case 'NOT' : temp = this.UNOP((x) => x ? TRUE : FALSE); break;
            case 'AND' : temp = this.BINOP((n, m) => n && m ? TRUE : FALSE); break;
            case 'OR'  : temp = this.BINOP((n, m) => n || m ? TRUE : FALSE); break;
            // ----------------------------------------------
            default:
                // if we don't know the op, then we should halt and complain!
                st = 'ERR';
                break;
            }
            break;
        default:
            // if we don't know the state, then we should halt and complain!
            st = 'ERR';
            break;
        }

        let snapshot : MachineSnapshot = {
            temp  : temp,
            instr : instruction,
            state : st,
            pc    : this.pc,
            ip    : this.ip,
            stack : this.stack.map((p) => p[0])
        };

        this.state = st;
        this.ip   += tm;
        this.pc   += 1;

        return snapshot;
    }

}

