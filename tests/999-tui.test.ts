
import { Display } from '../src/visualizer/Tools/Display';
import { BytecodeView } from '../src/visualizer/BytecodeView';

import { Bytecode } from '../src/machines/Strand/Bytecode'

import { powersOfTwo, countdown } from '../src/examples/Simple'
import { popTest, rotTest, swapTest, dupTest } from '../src/examples/OperationTests'

let display = new Display();
[
    new BytecodeView('powersOfTwo', powersOfTwo),
    new BytecodeView('countdown',   countdown),
    new BytecodeView('popTest',     popTest),
    new BytecodeView('rotTest',     rotTest),
    new BytecodeView('swapTest',    swapTest),
    new BytecodeView('dupTest',     dupTest),
].forEach(
    (table) => display.inline(table)
);


