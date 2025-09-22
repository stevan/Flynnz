
import {
    SCAN, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    EQZ, ANY,
    ___, TRUE, FALSE,
} from '../ISA.js'



export const powersOfTwo = [ // result should be 2 -> 256 by powers of 2
    [ SCAN, PUSH,   2,  1, TRUE  ],
    [ SCAN, DUP,  ___,  1, FALSE ],
    [ SCAN, ADD,  ___,  1, FALSE ],
    [ SCAN, DUP,  ___,  1, TRUE  ],
    [ SCAN, PUSH, 256,  1, FALSE ],
    [ SCAN, EQ,   ___,  1, FALSE ],
    [ JUMP, EQZ,  ___, -5, FALSE ],
    [ HALT, ___,  ___,  0, FALSE ],
];


export const countdown = [ // result should be 10 -> 1 range
    [ SCAN,  PUSH,  10,  1, TRUE,   ],
    [ SCAN,  DUP,  ___,  1, FALSE,  ],
    [ SCAN,  PUSH,   1,  1, FALSE,  ],
    [ SCAN,  SUB,  ___,  1, TRUE,   ],
    [ SCAN,  DUP,  ___,  1, FALSE,  ],
    [ SCAN,  PUSH,   1,  1, FALSE,  ],
    [ SCAN,  EQ,   ___,  1, FALSE,  ],
    [ JUMP,  EQZ,  ___, -6, FALSE,  ],
    [ HALT,  ___,  ___,  0, FALSE,  ],
];
