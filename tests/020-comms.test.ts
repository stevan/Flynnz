
import { Display } from '../src/visualizer/Tools/Display';
import { BytecodeView } from '../src/visualizer/BytecodeView';
import { MachineSnapshotView } from '../src/visualizer/MachineSnapshotView';

import { Machine } from '../src/machines/Strand/Machine'
import { Bytecode } from '../src/machines/Strand/Bytecode'

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

let display = new Display();
let bcView = new BytecodeView('countdown', program);
display.inline(bcView);

let machine = Machine.load(program.instructions, [ 10 ])
for (const entry of machine.run()) {
    display.inline(new MachineSnapshotView(entry))
}
console.log(machine.output.buffer);

console.log(program);
