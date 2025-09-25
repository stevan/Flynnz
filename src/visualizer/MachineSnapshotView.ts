
import { View } from './Tools/Display';

import {
    Instruction,
    Bytecode,
    OperationalState,
    Immediate,
} from '../machines/Strand/Bytecode'

import { MachineSnapshot } from '../machines/Strand/Machine'

const fmtPC = (pc : number) : string => pc.toString().padStart(3, '0');
const fmtIP = (ip : number) : string => ip.toString().padStart(3, '0');
const fmtST = (st : OperationalState) : string => {
    switch (st) {
    case 'SCAN': return `\x1b[94mSCAN\x1b[0m`;
    case 'COMM': return `\x1b[96mCOMM\x1b[0m`;
    case 'JUMP': return `\x1b[92mJUMP\x1b[0m`;
    case 'HALT': return `\x1b[91mHALT\x1b[0m`;
    case 'ERR' : return `\x1b[97;101mERR\x1b[0m`;
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
            (op ?? 'HALT').padEnd(6, ' '),
            `(${(this.snapshot.temp ?? 'null').toString().padStart(6, ' ')})`,
            fmtStack(this.snapshot.stack),
        ];
        return [ line.join(' ') ];
    }
}
