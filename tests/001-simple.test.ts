
import { Display } from '../src/visualizer/Tools/Display';
import { BytecodeView } from '../src/visualizer/BytecodeView';
import { MachineSnapshotView } from '../src/visualizer/MachineSnapshotView';

import { Machine } from '../src/machines/Strand/Machine'
import { Bytecode } from '../src/machines/Strand/Bytecode'

import { powersOfTwo, countdown } from '../src/examples/Simple'

let display = new Display();

function runProgram (name : string, program : Bytecode) {
    let bcView = new BytecodeView(name, program);

    display.inline(bcView);

    let machine = Machine.load(program.instructions, [])
    for (const entry of machine.run()) {
        display.inline(new MachineSnapshotView(entry))
    }
    console.log(machine.output.buffer);
}

runProgram('powersOfTwo', powersOfTwo);
runProgram('countdown', countdown);



