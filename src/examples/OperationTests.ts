
import {
    SCAN, COMM, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    GET, PUT,
    EQZ, ANY,
    ___, TRUE, FALSE,

    Instruction,
} from '../ISA'


export const popTest : Instruction[] = [ // result should be 8
    [ SCAN, PUSH,   5,  1, false ],
    [ SCAN, PUSH,   3,  1, false ],
    [ SCAN, PUSH,  10,  1, false ],
    [ SCAN, POP,  ___,  1, false ],
    [ SCAN, ADD,  ___,  1, true  ],
    [ HALT, ___,  ___,  0, false ],
];

export const rotTest : Instruction[] = [ // result should be 8
    [ SCAN, PUSH,   5,  1, false ],
    [ SCAN, PUSH,   3,  1, false ],
    [ SCAN, PUSH,  10,  1, false ],
    [ SCAN, ROT,  ___,  1, false ],
    [ SCAN, ADD,  ___,  1, true  ],
    [ HALT, ___,  ___,  0, false ],
];

export const swapTest : Instruction[] = [ // result should be 8
    [ SCAN, PUSH,   3,  1, false ],
    [ SCAN, PUSH,  10,  1, false ],
    [ SCAN, SWAP, ___,  1, false ],
    [ SCAN, PUSH,   5,  1, false ],
    [ SCAN, ADD,  ___,  1, true  ],
    [ HALT, ___,  ___,  0, false ],
];

export const dupTest : Instruction[] = [ // result should be 8
    [ SCAN, PUSH,   4,  1, false ],
    [ SCAN, DUP,  ___,  1, false ],
    [ SCAN, ADD,  ___,  1, true  ],
    [ HALT, ___,  ___,  0, false ],
];
