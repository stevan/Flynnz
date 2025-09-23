
import * as Debugger from '../src/Debugger.js'
import * as Machine  from '../src/machines/SISD/Machine.js'

import { popTest, rotTest, swapTest, dupTest } from '../src/examples/OperationTests.js'

Debugger.runPrograms(Machine, [
    [ 'popTest',  popTest  ],
    [ 'rotTest',  rotTest  ],
    [ 'swapTest', swapTest ],
    [ 'dupTest',  dupTest  ],
]);
