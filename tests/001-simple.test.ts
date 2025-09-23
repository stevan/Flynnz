
import * as Debugger from '../src/Debugger'
import { Machine } from '../src/machines/SISD/Machine'

import { powersOfTwo, countdown } from '../src/examples/Simple'

Debugger.runPrograms([
    [ 'powersOfTwo', Machine.load(powersOfTwo), true ],
    [ 'countdown',   Machine.load(countdown),   true ],
]);
