
import * as Debugger from '../src/Debugger.js'
import * as Machine  from '../src/machines/SISD.js'

import {
    SCAN, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    EQZ, ANY,
    ___, TRUE, FALSE,
} from '../src/ISA.js'

export const countdown = [
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


Debugger.runPrograms(Machine, [
    [ 'countdown', countdown ],
]);

