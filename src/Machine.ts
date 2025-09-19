
// -----------------------------------------------------------------------------

export interface StateTransition {}

export interface StateMachine<T extends StateTransition, U extends StateTransition> {
    step (trans : T) : U;
}

// -----------------------------------------------------------------------------

export type MachineState = 'HALT' | 'SCAN'

// -----------------------------------------------------------------------------

export type Opcode = 'HALT' | 'BEGIN' | 'END' | 'ADD' | 'PUSH'

export type Immediate        = number | null; // our machine only knows about numbers & null (ATM)
export type StackPointerMove = 0 | 1 | -1 // we only have null/bin/un ops, so this works
export type TapeHeadMove     = number; // jumps (while finite) are expressed as numbers

export type Bytecode = [ Opcode, Immediate, StackPointerMove, TapeHeadMove ];

export class Program {
    public code : Bytecode[];

    constructor(...code : Bytecode[]) {
        this.code = code;
    }

    get length () : number { return this.code.length }

    at (index : number) : Bytecode {
        return this.code[index] as Bytecode;
    }
}
