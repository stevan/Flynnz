
import { Display } from '../src/visualizer/Tools/Display';
import { BytecodeView } from '../src/visualizer/BytecodeView';
import { MachineSnapshotView } from '../src/visualizer/MachineSnapshotView';

import { Machine } from '../src/machines/SISD/Machine'
import { Bytecode } from '../src/ISA'

import { popTest, rotTest, swapTest, dupTest } from '../src/examples/OperationTests'

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

runProgram('popTest',  popTest  );
runProgram('rotTest',  rotTest  );
runProgram('swapTest', swapTest );
runProgram('dupTest',  dupTest  );


