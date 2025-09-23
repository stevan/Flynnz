
import * as Debugger from '../src/Debugger'
import { Machine } from '../src/machines/SISD/Machine'
import { InputChannel, OutputChannel } from '../src/machines/IO/Channels'

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

} from '../src/ISA'

export const countdown : Instruction[] = [
    [ COMM,  GET,  ___,  1, true  ],
    [ COMM,  PUT,  ___,  1, false ],
    [ SCAN,  DUP,  ___,  1, false ],
    [ SCAN,  PUSH,   1,  1, false ],
    [ SCAN,  SUB,  ___,  1, true  ],
    [ COMM,  PUT,  ___,  1, false ],
    [ SCAN,  DUP,  ___,  1, false ],
    [ SCAN,  PUSH,   1,  1, false ],
    [ SCAN,  EQ,   ___,  1, false ],
    [ JUMP,  EQZ,  ___, -6, false ],
    [ HALT,  ___,  ___,  0, false ],
];

Debugger.runPrograms([
    [ 'countdown', Machine.load(countdown, [ 10 ]), true ],
]);

