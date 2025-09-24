
import * as tty  from 'tty';
import * as ANSI from './ANSI'

export const MaxScreenHeight     = process.stdout.rows    - 2;
export const MaxScreenWidth      = process.stdout.columns - 2;
export const MaxScreenDimensions = [ MaxScreenHeight, MaxScreenWidth ]
export const ScreenOrigin        = [ 0, 0 ];
export const ScreenExtent        = [ ...MaxScreenDimensions ];

export interface View {
    dimensions : [ number, number ];
    position   : [ number, number ];
    scanlines  : string[];
}

export class Display {
    public tty   : tty.WriteStream;
    public views : View[];

    constructor(views : View[] = []) {
        this.tty   = process.stdout;
        this.views = views;
    }

    draw () : void {
        this.views.forEach((view, viewIdx) => {
            let [ h, w ] = view.dimensions;
            let [ x, y ] = view.position;

            this.tty.write( ANSI.formatCursorMove( x + 1, y + 1 ) );
            view.scanlines.map((line) => {
                this.tty.write( line + ANSI.formatCarrigeReturn(w) );
            })
        });
    }

    private setInterruptHandler (handler = () => { process.exit() }) {
        process.on('SIGINT', handler);
    }
}
