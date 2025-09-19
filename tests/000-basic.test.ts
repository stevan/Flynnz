
const STACK_SIZE = 16;
const MAX_LOOPS  = 16;

// -----------------------------------------------------------------------------

type Ticker = number; // counters
type Index  = number; // indicies

type StackPointerMove = 0 | 1 | -1 // we only have null/bin/un ops, so this works
type TapeHeadMove     = number; // jumps (while finite) are expressed as numbers

type Immediate = number    | null; // our machine only knows about numbers & null (ATM)
type StackCell = Immediate | undefined; // the stack can have undefined cells

const initTicker = () : Ticker  =>  0 as Ticker;
const initIndex  = () : Index   => -1 as Index;

// -----------------------------------------------------------------------------

// NOTE:
// this will need to be improved on later, but good for now
type Stack = StackCell[];

const initStack = (size : number) : Stack => Array(size).fill(undefined);

// -----------------------------------------------------------------------------

type Opcode = 'HALT' | 'BEGIN' | 'END' | 'ADD' | 'PUSH'

type Bytecode = [ Opcode, Immediate, StackPointerMove, TapeHeadMove ];

class Program {
    public code : Bytecode[];

    constructor(...code : Bytecode[]) {
        this.code = code;
    }

    get length () : number { return this.code.length }

    at (index : number) : Bytecode {
        return this.code[index] as Bytecode;
    }
}

// -----------------------------------------------------------------------------

type MachineState = 'HALT' | 'SCAN'

class MachineTransition {
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

class TapeTransition {
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

class ProgramMachine {
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

class TapeMachine {
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







