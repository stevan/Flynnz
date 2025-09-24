
import { Display } from '../src/visualizer/Tools/Display';

import { BytecodeView } from '../src/visualizer/BytecodeView';

import { Instruction, Bytecode } from '../src/ISA'

import { powersOfTwo, countdown } from '../src/examples/Simple'
import { popTest, rotTest, swapTest, dupTest } from '../src/examples/OperationTests'

let display = new Display();
[
    new BytecodeView('powersOfTwo', new Bytecode(...powersOfTwo)),
    new BytecodeView('countdown',   new Bytecode(...countdown)),
    new BytecodeView('popTest',     new Bytecode(...popTest)),
    new BytecodeView('rotTest',     new Bytecode(...rotTest)),
    new BytecodeView('swapTest',    new Bytecode(...swapTest)),
    new BytecodeView('dupTest',     new Bytecode(...dupTest)),
].forEach(
    (table) => display.inline(table)
);


