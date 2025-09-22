
import * as Debugger from '../src/Debugger.js'
import * as Machine  from '../src/Machine.js'

import { powersOfTwo, countdown } from '../src/examples/Simple.js'

[
    [ 'powersOfTwo', powersOfTwo ],
    [ 'countdown',   countdown   ],
].forEach((exe) => {
    let [ name, program ] = exe;
    Debugger.displayProgram(name, program);
    Debugger.displayRuntimeHeader(name);
    let output = [];
    for (const out of Machine.run(name, program, Debugger)) {
        Debugger.displayMachineState(out);
        output.push(out);
    }
    Debugger.displayRuntimeFooter();
    Debugger.displayProgramResults(name, output);
})
