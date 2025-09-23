
import {
    SCAN, COMM, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    GET, PUT,
    EQZ, ANY,
    ___, TRUE, FALSE,
} from '../ISA.js'


export const popTest = [ // result should be 8
    [ SCAN, PUSH,   5,  1, FALSE ],
    [ SCAN, PUSH,   3,  1, FALSE ],
    [ SCAN, PUSH,  10,  1, FALSE ],
    [ SCAN, POP,  ___,  1, FALSE ],
    [ SCAN, ADD,  ___,  1, TRUE  ],
    [ HALT, ___,  ___,  0, FALSE ],
];

export const rotTest = [ // result should be 8
    [ SCAN, PUSH,   5,  1, FALSE ],
    [ SCAN, PUSH,   3,  1, FALSE ],
    [ SCAN, PUSH,  10,  1, FALSE ],
    [ SCAN, ROT,  ___,  1, FALSE ],
    [ SCAN, ADD,  ___,  1, TRUE  ],
    [ HALT, ___,  ___,  0, FALSE ],
];

export const swapTest = [ // result should be 8
    [ SCAN, PUSH,   3,  1, FALSE ],
    [ SCAN, PUSH,  10,  1, FALSE ],
    [ SCAN, SWAP, ___,  1, FALSE ],
    [ SCAN, PUSH,   5,  1, FALSE ],
    [ SCAN, ADD,  ___,  1, TRUE  ],
    [ HALT, ___,  ___,  0, FALSE ],
];

export const dupTest = [ // result should be 8
    [ SCAN, PUSH,   4,  1, FALSE ],
    [ SCAN, DUP,  ___,  1, FALSE ],
    [ SCAN, ADD,  ___,  1, TRUE  ],
    [ HALT, ___,  ___,  0, FALSE ],
];
