
import * as Debugger from '../src/Debugger.js'
import { Machine } from '../src/machines/SISD/Machine.js'

import { powersOfTwo, countdown } from '../src/examples/Simple.js'

Debugger.runPrograms(Machine.load, [
    [ 'powersOfTwo', powersOfTwo ],
    [ 'countdown',   countdown   ],
]);
