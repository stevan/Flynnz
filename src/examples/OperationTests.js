
import {
    SCAN, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
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
