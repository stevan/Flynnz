// -----------------------------------------------------------------------------
// Instruction Set
// -----------------------------------------------------------------------------

export const TRUE  = 1 as const;
export const FALSE = 0 as const;

export const ___ = null;

// -----------------------------------------------------------------------------
// Instructions
// -----------------------------------------------------------------------------

// ---------------------------
export const SCAN = 'SCAN' as const;
// ---------------------------
export const PUSH = 'PUSH' as const;
export const DUP  = 'DUP' as const;
export const POP  = 'POP' as const;
export const SWAP = 'SWAP' as const;
export const ROT  = 'ROT' as const;

export const NEG = 'NEG' as const
export const ADD = 'ADD' as const;
export const SUB = 'SUB' as const;
export const MUL = 'MUL' as const;
export const DIV = 'DIV' as const;
export const MOD = 'MOD' as const;

export const EQ = 'EQ' as const;
export const NE = 'NE' as const;
export const LT = 'LT' as const;
export const LE = 'LE' as const;
export const GT = 'GT' as const;
export const GE = 'GE' as const;

export const NOT = 'NOT' as const;
export const AND = 'AND' as const;
export const OR  = 'OR' as const;

// ---------------------------
export const COMM = 'COMM' as const;
// ---------------------------

export const PUT = 'PUT' as const;
export const GET = 'GET' as const;

// ---------------------------
export const JUMP  = 'JUMP' as const;
// ---------------------------

export const EQZ = 'EQZ' as const;
export const ANY = 'ANY' as const;

// ---------------------------
export const ERR  = 'ERR' as const;
// ---------------------------

// ---------------------------
export const HALT = 'HALT' as const;
// ---------------------------

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
            if (st == JUMP && op == EQZ) {
                this.jumpTargets.push((idx + tm) - 1);
            }
        })
    }
}










