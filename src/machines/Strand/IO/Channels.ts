
import { Immediate } from '../Bytecode'

export class IOChannel {
    public buffer : Immediate[]
    public index  : number;

    constructor(...buffer : Immediate[]) {
        this.buffer = buffer;
        this.index  = 0;
    }

    isExhausted () : boolean { return this.index >= this.buffer.length }
    appendValue (v : Immediate) : void { this.buffer.push(v) }
    acceptValue () : Immediate { return this.buffer[this.index++] as Immediate }
}
