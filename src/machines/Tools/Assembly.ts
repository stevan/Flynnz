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
