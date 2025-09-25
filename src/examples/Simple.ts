
import { Bytecode } from '../machines/Strand/Bytecode'
import {
    SCAN, COMM, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    GET, PUT,
    EQZ, ANY,
    ___, TRUE, FALSE,
} from '../machines/Tools/Assembly'

// result should be 2 -> 256 by powers of 2
export const powersOfTwo = new Bytecode(
    [ SCAN, PUSH,   2,  1, true  ],
    [ SCAN, DUP,  ___,  1, false ],
    [ SCAN, ADD,  ___,  1, false ],
    [ SCAN, DUP,  ___,  1, true  ],
    [ SCAN, PUSH, 256,  1, false ],
    [ SCAN, EQ,   ___,  1, false ],
    [ JUMP, EQZ,  ___, -5, false ],
    [ HALT, ___,  ___,  0, false ],
);


// result should be 10 -> 1 range
export const countdown = new Bytecode(
    [ SCAN,  PUSH,  10,  1, true   ],
    [ SCAN,  DUP,  ___,  1, false  ],
    [ SCAN,  PUSH,   1,  1, false  ],
    [ SCAN,  SUB,  ___,  1, true   ],
    [ SCAN,  DUP,  ___,  1, false  ],
    [ SCAN,  PUSH,   1,  1, false  ],
    [ SCAN,  EQ,   ___,  1, false  ],
    [ JUMP,  EQZ,  ___, -6, false  ],
    [ HALT,  ___,  ___,  0, false  ],
);
