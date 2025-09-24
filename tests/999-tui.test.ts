

import * as Unicode from '../src/visualizer/Tools/Unicode'

import { Display, View } from '../src/visualizer/Tools/Display';
import { BasicBox } from '../src/visualizer/Tools/Widgets/BasicBox';
import { BasicTable } from '../src/visualizer/Tools/Widgets/BasicTable';

class ProgramTable implements View {
    constructor(
        public dimensions : [ number, number ],
        //public program    : any[][],
    ) {}

    get scanlines () : string[] {
        let lines = [];
        lines.push('Hello');
        lines.push('World');
        return lines;
    }

}

let table = new ProgramTable([ 10, 40 ]);

let display = new Display();
display.inline(table);
