
// -----------------------------------------------------------------------------
// Instruction Types
// -----------------------------------------------------------------------------
// 1) machine state to transition to
// 2) machine operation to perform
// 3) immediate data needed for the op
// 4) direction and distance of next tape move
// 6) keep value for the heap?
// -----------------------------------------------------------------------------

export type OperationalState = 'SCAN' | 'COMM' | 'JUMP' | 'ERR' | 'HALT'

// ...
export type ScanOperation =
    | 'PUSH' | 'DUP' | 'POP' | 'SWAP' | 'ROT'
    | 'NEG'  | 'ADD' | 'SUB' | 'MUL'  | 'DIV' | 'MOD'
    | 'EQ'   | 'NE'  | 'LT'  | 'LE'   | 'GT'  | 'GE'
    | 'NOT'  | 'AND' | 'OR'
export type JumpOperation = 'EQZ' | 'ANY'
export type CommOperation = 'GET' | 'PUT'

export type ___ = null
export type Immediate = number
export type Literal   = Immediate | null
export type TapeMove     = 1
export type TapeStop     = 0
export type TapeJump     = number
export type TapeMovement = TapeMove | TapeStop | TapeJump

export type Retain    = boolean
export type ErrorCode = string

export type Instruction =
    | [ 'SCAN', ScanOperation, Literal, TapeMove, Retain ]
    | [ 'COMM', CommOperation, ___,     TapeMove, Retain ]
    | [ 'JUMP', JumpOperation, ___,     TapeJump, Retain ]
    | [ 'ERR',  ErrorCode,     ___,     TapeStop, Retain ]
    | [ 'HALT', ___,           ___,     TapeStop, Retain ]

// -----------------------------------------------------------------------------

export class Bytecode {
    public instructions : Instruction[];
    public jumpTargets  : number[] = [];

    constructor(...instructions : Instruction[]) {
        this.instructions = instructions;

        this.instructions.forEach((instr, idx) => {
            let [ st, op, data, tm, retain ] = instr;
            if (st == 'JUMP' && op == 'EQZ') {
                let moveFrom = idx;
                console.log(instr, idx, moveFrom, tm);
                this.jumpTargets.push(moveFrom + tm);
            }
        })
    }
}

