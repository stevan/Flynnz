
import {
    Stack,  initStack,
    Index,  initIndex,
    Ticker, initTicker,
} from './Tools'
import {
    StateMachine, StateTransition, MachineState,
    Program, Bytecode,
    Opcode, Immediate, StackPointerMove, TapeHeadMove,
} from '../Machine'

const STACK_SIZE = 16;
const MAX_LOOPS  = 16;

// -----------------------------------------------------------------------------

export class ProgramMachine {
    public state   : MachineState;
    public tick    : Ticker;
    public program : Program;
    // tape management
    public ic    : Ticker;
    public ip    : Index;
    public sp    : Index;
    public stack : Stack;

    constructor(program : Program) {
        this.state   = 'HALT';
        this.tick    = initTicker();
        this.program = program;
        // tape management
        this.ic      = initTicker();
        this.ip      = initIndex();
        this.sp      = initIndex();
        this.stack   = initStack(STACK_SIZE);
    }

    start () : boolean {
        this.state = 'SCAN';
        this.ip    = 0;
    }

    step () : boolean {
        this.tick++;

        if (this.state == 'HALT')           return false;
        if (this.ip >= this.program.length) return false;

        let instr = this.program.at(trans.ip);
        let [ opcode, data, stackMove, tapeMove ] = instr;
        let tos  = this.sp;

        this.sp += stackMove;
        this.ip += tapeMove;
        this.ic++;

        switch (opcode) {
            case 'PUSH':
                this.stack[this.sp] = data;
                break;
            case 'ADD':
                let lhs = this.stack[tos - 1];
                let rhs = this.stack[tos];
                if (lhs == undefined || rhs == undefined) throw new Error(`StackUnderflow`);
                this.stack[this.sp] = lhs + rhs;
                this.stack[tos] = undefined;
                break;
            case 'HALT':
            default:
                return false;
        }

        return true;
    }

    toString () : string {
        return `Program[ state: ${this.state} @ tick: ${this.tick} ]`
    }
}
