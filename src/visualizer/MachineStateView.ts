
import { View } from './Tools/Display';

import {
    SCAN, COMM, JUMP, HALT, ERR,
    Instruction,
    Bytecode,
    OperationalState,
} from '../ISA'

import { MachineState, StackValue } from '../machines/SISD/MachineState'

const fmtPC = (pc : number) : string => pc.toString().padStart(3, '0');
const fmtIP = (ip : number) : string => ip.toString().padStart(3, '0');
const fmtST = (st : OperationalState) : string => {
    switch (st) {
    case SCAN: return SCAN;
    case COMM: return COMM;
    case JUMP: return JUMP;
    case HALT: return HALT;
    case ERR : return ERR;
    default: return 'WTF!'
    }
}
const fmtStack = (stack : StackValue[]) : string => `[${stack.join(', ')}]`

export class MachineStateView implements View {
    public dimensions : [ number, number ] = [ 1, 50 ];

    constructor(
        public state : MachineState
    ) {}

    get scanlines () : string[] {
        let line = [
            fmtPC(this.state.pc),
            fmtST(this.state.state),
            fmtIP(this.state.ip),
            fmtStack(this.state.stack),
        ];
        return [ line.join(' ') ];
    }
}
