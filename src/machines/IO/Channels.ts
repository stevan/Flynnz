

export class InputChannel {
    public index  : number;
    public source : number[]

    constructor(...source : number[]) {
        this.source = source;
        this.index  = 0;
    }

    readValue () : number {
        return this.source[ this.index++ ] as number;
    }
}

export class OutputChannel {
    public sink : number[] = [];

    writeValue (value : number) : void {
        this.sink.push(value)
    }
}
