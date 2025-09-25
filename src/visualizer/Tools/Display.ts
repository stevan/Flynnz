
import * as tty  from 'tty';
import * as ANSI from './ANSI'

export const MaxScreenHeight     = process.stdout.rows    - 2;
export const MaxScreenWidth      = process.stdout.columns - 2;
export const MaxScreenDimensions = [ MaxScreenHeight, MaxScreenWidth ]
export const ScreenOrigin        = [ 0, 0 ];
export const ScreenExtent        = [ ...MaxScreenDimensions ];

export interface View {
    dimensions : [ number, number ];
    scanlines  : string[];
}

export class Display {
    public tty : tty.WriteStream;

    constructor() {
        this.tty = process.stdout;
    }

    draw (view : View, at : [ number, number ]) : void {
        let [ x, y ] = at;
        let [ h, w ] = view.dimensions;

        this.tty.write( ANSI.formatCursorMove( x + 1, y + 1 ) );
        view.scanlines.map((line) => {
            this.tty.write( line + ANSI.formatCarrigeReturn(w) );
        });
        this.tty.write('\r');
    }

    inline (view : View, indent : number = 0) : void {
        let indentStr = indent == 0 ? '' : ' '.repeat(indent);
        let [ h, w ] = view.dimensions;
        view.scanlines.map((line) => {
            this.tty.write( indentStr + line + '\n' );
        });
    }

    private setInterruptHandler (handler = () => { process.exit() }) {
        process.on('SIGINT', handler);
    }
}
