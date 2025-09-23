// -----------------------------------------------------------------------------
// Instruction Set
// -----------------------------------------------------------------------------

export const ___ = null;

export const TRUE  = 1;
export const FALSE = 0;

// -----------------------------------------------------------------------------
// Instructions
// -----------------------------------------------------------------------------
// 1) machine state to transition to
// 2) machine operation to perform
// 3) immediate data needed for the op
// 4) direction and distance of next tape move
// 6) keep value for the heap?
// -----------------------------------------------------------------------------

// ---------------------------
export const SCAN = 'SCAN';
// ---------------------------
export const PUSH = 'PUSH';
export const DUP  = 'DUP';
export const POP  = 'POP';
export const SWAP = 'SWAP';
export const ROT  = 'ROT';

export const NEG = 'NEG'
export const ADD = 'ADD';
export const SUB = 'SUB';
export const MUL = 'MUL';
export const DIV = 'DIV';
export const MOD = 'MOD';

export const EQ = 'EQ';
export const NE = 'NE';
export const LT = 'LT';
export const LE = 'LE';
export const GT = 'GT';
export const GE = 'GE';

export const NOT = 'NOT';
export const AND = 'AND';
export const OR  = 'OR';

// ---------------------------
export const COMM = 'COMM';
// ---------------------------

export const PUT = 'PUT';
export const GET = 'GET';

// ---------------------------
export const JUMP  = 'JUMP';
// ---------------------------

export const EQZ = 'EQZ';
export const ANY = 'ANY';

// ---------------------------
export const ERR  = 'ERR';
// ---------------------------

// ---------------------------
export const HALT = 'HALT';
// ---------------------------


// -----------------------------------------------------------------------------
