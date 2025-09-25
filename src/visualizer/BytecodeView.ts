
import { View } from './Tools/Display';

import { Instruction, Bytecode } from '../machines/Strand/Bytecode'

export class BytecodeView implements View {
    public dimensions : [ number, number ] = [ 0, 50 ];

    constructor(
        public name    : string,
        public program : Bytecode,
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
                    return `    │ ${idx.toString().padStart(3, '0')} ${st} ${op?.padEnd(5, ' ')} ${tm == null ? '' : (`❮${(idx + tm).toString().padStart(3, '0')}❯`).padEnd(10, ' ')}`;
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
