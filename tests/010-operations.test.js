
import * as Debugger from '../src/Debugger.js'
import * as Machine  from '../src/machines/SISD.js'

import { popTest } from '../src/examples/OperationTests.js'

Debugger.runPrograms(Machine, [
    [ 'popTest', popTest ],
]);
