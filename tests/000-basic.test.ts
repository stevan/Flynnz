
import { Program } from '../src/Machine'
import {
    ProgramMachine, TapeMachine,
    MachineTransition,
} from '../src/Machines/Scalar'

const __ : null = null;

let code = new Program(
    ['PUSH', 10,  1,  1 ],
    ['PUSH', 20,  1,  1 ],
    ['ADD',  __, -1,  1 ],
    ['PUSH', 30,  1,  1 ],
    ['ADD',  __, -1,  1 ],
);

let program = new ProgramMachine(code);
let tape    = new TapeMachine();

let programTrans = MachineTransition.getStartTransition();

while (true) {
    console.log('BEFORE', program.toString());
    let tapeTrans = program.step(programTrans);
    console.log('>TAPE', tapeTrans.toString());

    console.log('BEFORE', tape.toString());
    programTrans = tape.step(tapeTrans);
    console.log('>PROGRAM', programTrans.toString());

    console.log('-'.repeat(80));
    if (program.state == 'HALT') break;
}

console.log('DONE', program.toString());
console.log('DONE', tape.toString());







