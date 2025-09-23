
import * as Debugger from '../src/Debugger'
import { Machine } from '../src/machines/SISD/Machine'

import { popTest, rotTest, swapTest, dupTest } from '../src/examples/OperationTests'

Debugger.runPrograms([
    [ 'popTest',  Machine.load(popTest),  true ],
    [ 'rotTest',  Machine.load(rotTest),  true ],
    [ 'swapTest', Machine.load(swapTest), true ],
    [ 'dupTest',  Machine.load(dupTest),  true ],
]);
