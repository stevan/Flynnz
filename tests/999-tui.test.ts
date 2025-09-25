
import { Display } from '../src/visualizer/Tools/Display';
import { BytecodeView } from '../src/visualizer/BytecodeView';

import { Bytecode } from '../src/machines/Strand/Bytecode'

import { powersOfTwo, countdown } from '../src/examples/Simple'
import { popTest, rotTest, swapTest, dupTest } from '../src/examples/OperationTests'

import {
    SCAN, COMM, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    GET, PUT,
    EQZ, ANY,
    ___, TRUE, FALSE,
} from '../src/machines/Tools/Assembly'

let program = new Bytecode(
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
);

console.log(countdown);
console.log(powersOfTwo);
console.log(program);

let display = new Display();
[
    new BytecodeView('powersOfTwo', powersOfTwo),
    new BytecodeView('countdown',   countdown),
    new BytecodeView('countdown2',   program),
    new BytecodeView('popTest',     popTest),
    new BytecodeView('rotTest',     rotTest),
    new BytecodeView('swapTest',    swapTest),
    new BytecodeView('dupTest',     dupTest),
].forEach(
    (table) => display.inline(table)
);


