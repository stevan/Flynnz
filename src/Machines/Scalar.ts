
import {
    Stack,  initStack,
    Index,  initIndex,
    Ticker, initTicker,
} from './Tools'
import {
    StateMachine, StateTransition, MachineState,
    Program, Opcode, Immediate, StackPointerMove, TapeHeadMove,
} from '../Machine'

const STACK_SIZE = 16;
const MAX_LOOPS  = 16;

// -----------------------------------------------------------------------------

export class MachineTransition implements StateTransition {
    constructor(
        public state : MachineState, // next state
        public ip    : Index,        // next instruction pointer
    ) {}

    static getHaltTransition () : MachineTransition {
        return new MachineTransition('HALT', -1);
    }

    static getStartTransition () : MachineTransition {
        return new MachineTransition('SCAN', 0);
    }

    toString () : string {
        return `MachineTransition( state: ${this.state} @ ip: ${this.ip} )`
    }
}

export class ProgramMachine implements StateMachine<MachineTransition, TapeTransition> {
    public state   : MachineState;
    public tick    : Ticker;
    public program : Program;

    constructor(program : Program) {
        this.state   = 'HALT';
        this.tick    = initTicker();
        this.program = program;
    }

    step (trans : MachineTransition) : TapeTransition {
        this.tick++;
        this.state = trans.state;

        if (this.state == 'HALT')            return TapeTransition.getHaltTransition();
        if (trans.ip >= this.program.length) return TapeTransition.getHaltTransition();

        let instr = this.program.at(trans.ip);
        // let [ op, data, stack_diff, direction ] = instr;
        return new TapeTransition( ...instr );
    }

    toString () : string {
        return `Program[ state: ${this.state} @ tick: ${this.tick} ]`
    }
}

// -----------------------------------------------------------------------------

export class TapeTransition implements StateTransition {
    constructor(
        public opcode    : Opcode,
        public data      : Immediate | null,
        public stackMove : StackPointerMove,
        public tapeMove  : TapeHeadMove
    ) {}

    static getHaltTransition () : TapeTransition {
        return new TapeTransition('HALT', null, 0, 0);
    }

    toString () : string {
        return `TapeTransition( opcode: ${this.opcode} data?: ${this.data ?? '~'} stack(+/-): ${this.stackMove} tape(+/-): ${this.tapeMove} )`
    }
}

// -----------------------------------------------------------------------------

export class TapeMachine implements StateMachine<TapeTransition, MachineTransition> {
    public ic    : Ticker;
    public ip    : Index;
    public sp    : Index;
    public stack : Stack;

    constructor() {
        this.ic    = initTicker();
        this.ip    = initIndex();
        this.sp    = initIndex();
        this.stack = initStack(STACK_SIZE);
    }

    step (trans : TapeTransition) : MachineTransition {
        let tos = this.sp;
        this.sp += trans.stackMove;

        this.ip = this.ip < 0 ? trans.tapeMove : trans.tapeMove + this.ip;
        this.ic++;

        switch (trans.opcode) {
            case 'PUSH':
                this.stack[this.sp] = trans.data;
                return new MachineTransition('SCAN', this.ip)
            case 'ADD':
                let lhs = this.stack[tos - 1];
                let rhs = this.stack[tos];
                if (lhs == undefined || rhs == undefined) throw new Error(`StackUnderflow`);
                this.stack[this.sp] = lhs + rhs;
                this.stack[tos] = undefined;
                return new MachineTransition('SCAN', this.ip)
            case 'HALT':
            default:
                return MachineTransition.getHaltTransition();
        }
    }

    toString () : string {
        return `Tape[ ip: ${this.ip}, ic: ${this.ic}, sp: ${this.sp} ][${this.stack.filter((x) => x != undefined).join(',')}]`
    }
}
