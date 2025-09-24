

import * as Unicode from '../src/visualizer/Tools/Unicode'
import * as ANSI    from '../src/visualizer/Tools/ANSI'

import { Display, View } from '../src/visualizer/Tools/Display';
import { BasicBox } from '../src/visualizer/Tools/Widgets/BasicBox';

import {
    SCAN, COMM, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    GET, PUT,
    EQZ, ANY,
    ___, TRUE, FALSE,

    Instruction,

} from '../src/ISA'

class Program {
    public instructions : Instruction[];
    public jumpTargets  : number[] = [];

    constructor(...instructions : Instruction[]) {
        this.instructions = instructions;

        this.instructions.forEach((instr, idx) => {
            let [ st, op, data, tm, retain ] = instr;
            if (st == JUMP && op == EQZ) {
                this.jumpTargets.push((idx + 1) + tm);
            }
        })
    }
}

class ProgramTable implements View {
    public dimensions : [ number, number ] = [ 0, 50 ];

    constructor(
        public name    : string,
        public program : Program,
    ) {
        this.dimensions[0] = program.instructions.length + program.jumpTargets.length + 1;
    }

    get scanlines () : string[] {
        let lines = [
            `:${this.name}`,
            ...this.program.instructions.map((instruction, idx) => {
                let [ st, op, data, tm, retain ] = instruction;
                if (st == 'HALT') {
                    return `    ╰───● HALT`;
                }
                else if (st == 'JUMP') {
                    return `    │ ${idx.toString().padStart(3, '0')} ${st} ${op?.padEnd(5, ' ')} ${tm == null ? '' : (`❮${((idx + 1) + tm).toString().padStart(3, '0')}❯`).padEnd(10, ' ')}`;
                }
                else if (this.program.jumpTargets.length > 0 && this.program.jumpTargets.indexOf(idx) != -1) {
                    return `    ├───◯` + '\n' +
                           `    │ ${idx.toString().padStart(3, '0')} ${st} ${op?.padEnd(5, ' ')} ${data == null ? '' : data.toString().padEnd(10, ' ')}`;
                } else {
                    return `    │ ${idx.toString().padStart(3, '0')} ${st} ${op?.padEnd(5, ' ')} ${data == null ? '' : data.toString().padEnd(10, ' ')}`;
                }
            })
        ];
        return lines;
    }
}

import { powersOfTwo, countdown } from '../src/examples/Simple'
import { popTest, rotTest, swapTest, dupTest } from '../src/examples/OperationTests'


let display = new Display();

[
    new ProgramTable('powersOfTwo', new Program(...powersOfTwo)),
    new ProgramTable('countdown',   new Program(...countdown)),
    new ProgramTable('popTest',     new Program(...popTest)),
    new ProgramTable('rotTest',     new Program(...rotTest)),
    new ProgramTable('swapTest',    new Program(...swapTest)),
    new ProgramTable('dupTest',     new Program(...dupTest)),
].forEach(
    (table) => display.inline(table)
);


