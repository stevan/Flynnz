
import { View } from './Tools/Display';

import {
    SCAN, COMM, JUMP, HALT, ERR,
    Instruction,
    Bytecode,
    OperationalState,
    Immediate,
} from '../ISA'

import { MachineSnapshot } from '../machines/SISD/Machine'

const fmtPC = (pc : number) : string => pc.toString().padStart(3, '0');
const fmtIP = (ip : number) : string => ip.toString().padStart(3, '0');
const fmtST = (st : OperationalState) : string => {
    switch (st) {
    case SCAN: return `\x1b[94m${SCAN}\x1b[0m`;
    case COMM: return `\x1b[96m${COMM}\x1b[0m`;
    case JUMP: return `\x1b[92m${JUMP}\x1b[0m`;
    case HALT: return `\x1b[91m${HALT}\x1b[0m`;
    case ERR : return `\x1b[97;101m${ERR}\x1b[0m`;
    default: return 'WTF!'
    }
}
const fmtStack = (stack : Immediate[]) : string => `[${stack.join(', ')}]`

export class MachineSnapshotView implements View {
    public dimensions : [ number, number ] = [ 1, 50 ];

    constructor(
        public snapshot : MachineSnapshot
    ) {}

    get scanlines () : string[] {
        let [ st, op, data, tm, retain ] = this.snapshot.instr;
        let line = [
            fmtPC(this.snapshot.pc),
            fmtST(this.snapshot.state),
            fmtIP(this.snapshot.ip),
            (op ?? HALT).padEnd(6, ' '),
            `(${(this.snapshot.temp ?? 'null').toString().padStart(6, ' ')})`,
            fmtStack(this.snapshot.stack),
        ];
        return [ line.join(' ') ];
    }
}
