
import * as Debugger from '../src/Debugger.js'
import * as Machine  from '../src/Machine.js'

import { popTest } from '../src/examples/OperationTests.js'


Debugger.displayProgram('popTest', popTest);
let output = Machine.runProgram('popTest', popTest, Debugger);
Debugger.displayProgramResults('popTest', output);
