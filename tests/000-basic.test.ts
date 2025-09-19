

import { Stack, initStack } from '../src/Stack'
import { StateMachine, StateTransition } from '../src/Machine'
import { Program, Opcode, Immediate, StackPointerMove, TapeHeadMove } from '../src/Bytecode'


const STACK_SIZE = 16;
const MAX_LOOPS  = 16;

// -----------------------------------------------------------------------------

type Ticker = number; // counters
type Index  = number; // indicies

const initTicker = () : Ticker  =>  0 as Ticker;
const initIndex  = () : Index   => -1 as Index;

// -----------------------------------------------------------------------------

type MachineState = 'HALT' | 'SCAN'

class MachineTransition implements StateTransition {
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

class TapeTransition implements StateTransition {
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

class ProgramMachine implements StateMachine<MachineTransition, TapeTransition> {
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

class TapeMachine implements StateMachine<TapeTransition, MachineTransition> {
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

// -----------------------------------------------------------------------------

const __ : null = null;

let code = new Program(
    ['PUSH', 10,  1,  1 ],
    ['PUSH', 20,  1,  1 ],
    ['ADD',  __, -1,  1 ],
    ['PUSH', 30,  1,  1 ],
    ['ADD',  __, -1,  1 ],
);


let program = new ProgramMachine(code);
let tape    = new TapeMachine();

let programTrans = MachineTransition.getStartTransition();

while (true) {
    console.log('BEFORE', program.toString());
    let tapeTrans = program.step(programTrans);
    console.log('>TAPE', tapeTrans.toString());

    console.log('BEFORE', tape.toString());
    programTrans = tape.step(tapeTrans);
    console.log('>PROGRAM', programTrans.toString());

    console.log('-'.repeat(80));
    if (program.state == 'HALT') break;
}

console.log('DONE', program.toString());
console.log('DONE', tape.toString());







