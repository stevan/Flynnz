
import * as Debugger from '../src/Debugger.js'
import * as Machine  from '../src/Machine.js'

import { powersOfTwo, countdown } from '../src/examples/Simple.js'

Debugger.runPrograms(Machine, [
    [ 'powersOfTwo', powersOfTwo ],
    [ 'countdown',   countdown   ],
]);
