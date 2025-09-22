
import * as Debugger from '../src/Debugger.js'
import * as Machine  from '../src/Machine.js'

import { powersOfTwo, countdown } from '../src/examples/Simple.js'

[
    [ 'powersOfTwo', powersOfTwo ],
    [ 'countdown',   countdown   ],
].forEach((exe) => {
    let [ name, program ] = exe;
    Debugger.displayProgram(name, program);
    let output = Machine.runProgram(name, program, Debugger);
    Debugger.displayProgramResults(name, output);
})
