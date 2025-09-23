
import * as Debugger from '../src/Debugger.js'
import { Machine } from '../src/machines/SISD/Machine.js'

import {
    SCAN, COMM, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    GET, PUT,
    EQZ, ANY,
    ___, TRUE, FALSE,
} from '../src/ISA.js'

export const countdown = [
    [ COMM,  GET,  ___,  1, FALSE,  ],
    [ COMM,  PUT,  ___,  1, FALSE,  ],
    [ SCAN,  DUP,  ___,  1, FALSE,  ],
    [ SCAN,  PUSH,   1,  1, FALSE,  ],
    [ SCAN,  SUB,  ___,  1, FALSE,  ],
    [ COMM,  PUT,  ___,  1, FALSE,  ],
    [ SCAN,  DUP,  ___,  1, FALSE,  ],
    [ SCAN,  PUSH,   1,  1, FALSE,  ],
    [ SCAN,  EQ,   ___,  1, FALSE,  ],
    [ JUMP,  EQZ,  ___, -6, FALSE,  ],
    [ HALT,  ___,  ___,  0, FALSE,  ],
];

Debugger.runPrograms(Machine.load, [
    [ 'countdown', countdown, [ 10 ], [] ],
]);


