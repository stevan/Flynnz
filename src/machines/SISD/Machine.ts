
import { MAX_LOOPS } from '../../Constants'
import {
    SCAN, COMM, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    GET, PUT,
    EQZ, ANY,
    TRUE, FALSE,

    Instruction,
    OperationalState,
    TapeMovement,
    Immediate,

} from '../../ISA'

import {
    InputChannel,
    OutputChannel,
} from '../IO/Channels'

import {
    MachineState,
    MachineStateSnapshot,
} from './MachineState'

export type Temporary = Immediate | null

export type MachineLog = [ Temporary, OperationalState, Instruction, MachineStateSnapshot ]

export class Machine {

    constructor(
        public state    : MachineState,
        public program  : Instruction[],
        public input    : InputChannel,
        public output   : OutputChannel,
    ) {}

    static load (program : Instruction[], input? : InputChannel | number[], output? : OutputChannel) : Machine {
        return new Machine(
            MachineState.initialState(),
            program,
            (input == undefined
                ? new InputChannel()
                : Array.isArray(input)
                    ? new InputChannel(...input)
                    : input),
            (output ?? new OutputChannel()),
        )
    }

    *run () : Generator<MachineLog, void, void> {
        while (this.state.isRunning()) {
            yield this.step();
            if (this.state.pc >= MAX_LOOPS) break;
        }
    }

    step () : MachineLog {
        // ---------------------------------------------------------------------
        // Decode the instruction
        // ---------------------------------------------------------------------
        let instruction = this.program[this.state.ip] as Instruction;
        let [ st, op, data, tm, retain ] = instruction;

        let temp : Temporary = null;

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
                tm = this.state.checkIfZero() ? tm : 1;
                break;
            default:
                // if we don't know the op, then we should halt and complain!
                st = ERR;
                break;
            }
            break;
        case COMM:
            switch (op) {
            case GET:
                temp = this.state.PUSH(this.input.readValue() as Immediate);
                break;
            case PUT:
                temp = this.state.getValueAtTOS();
                this.output.writeValue(temp);
                break;
            default:
                // if we don't know the op, then we should halt and complain!
                st = ERR;
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
            case PUSH : temp = this.state.PUSH(data as Immediate); break;
            case DUP  : temp = this.state.DUP(); break;
            // just alters the stack, no temp needed
            case POP  : this.state.POP();  break;
            case SWAP : this.state.SWAP(); break;
            case ROT  : this.state.ROT();  break;
            // ----------------------------------------------
            // maths ...
            // ----------------------------------------------
            case NEG: temp = this.state.UNOP((x) => -x); break;
            case ADD: temp = this.state.BINOP((n, m) => n + m ); break;
            case SUB: temp = this.state.BINOP((n, m) => n - m ); break;
            case MUL: temp = this.state.BINOP((n, m) => n * m ); break;
            case DIV: temp = this.state.BINOP((n, m) => n / m ); break;
            case MOD: temp = this.state.BINOP((n, m) => n % m ); break;
            // ----------------------------------------------
            // comparison ...
            // ----------------------------------------------
            case EQ: temp = this.state.BINOP((n, m) => n == m ? TRUE : FALSE); break;
            case NE: temp = this.state.BINOP((n, m) => n != m ? TRUE : FALSE); break;
            case LT: temp = this.state.BINOP((n, m) => n <  m ? TRUE : FALSE); break;
            case LE: temp = this.state.BINOP((n, m) => n <= m ? TRUE : FALSE); break;
            case GT: temp = this.state.BINOP((n, m) => n >  m ? TRUE : FALSE); break;
            case GE: temp = this.state.BINOP((n, m) => n >= m ? TRUE : FALSE); break;
            // ----------------------------------------------
            // logical ...
            // ----------------------------------------------
            case NOT: temp = this.state.UNOP((x) => x ? TRUE : FALSE); break;
            case AND: temp = this.state.BINOP((n, m) => n && m ? TRUE : FALSE); break;
            case OR:  temp = this.state.BINOP((n, m) => n || m ? TRUE : FALSE); break;
            // ----------------------------------------------
            default:
                // if we don't know the op, then we should halt and complain!
                st = ERR;
                break;
            }
            break;
        default:
            // if we don't know the state, then we should halt and complain!
            st = ERR;
            break;
        }

        return [ temp, st, instruction, this.state.advance(st, tm) ] as MachineLog;
    }

}
