
import { View } from '../Display';
import * as Unicode from '../Unicode'

export type BoxConfig = {
    height : number,
    width  : number,
    data   : any[],
    // padding?
    // spacing?
    // border-style?
    // bg-color?
    // fg-color?
    // initial-value?
}

export class BasicBox implements View {
    public position   : [ number, number ];
    public dimensions : [ number, number ];
    public config     : BoxConfig;

    constructor( position : [ number, number ], config : BoxConfig) {
        this.config     = config;
        this.position   = position;
        this.dimensions = [ config.height, config.width ]
    }

    get scanlines () : string[] {
        let [ h, w ] = this.dimensions.map((d) => d - 2); // subtrack 2 for the borders
        return [
            [
                Unicode.Boxes.Curved.TopLeft,
                Unicode.Boxes.Horizontal.repeat(w),
                Unicode.Boxes.Curved.TopRight,
            ],
            ...([
                ...this.config.data.slice(0, h),
                ...((this.config.data.length >= h) ? [] : Array(h - this.config.data.length).fill(''))
            ].map((d, i) => {
                return [
                    Unicode.Boxes.Vertical,
                    d.padEnd(w),
                    Unicode.Boxes.Vertical,
                ]
            })),
            [
                Unicode.Boxes.Curved.BottomLeft,
                Unicode.Boxes.Horizontal.repeat(w),
                Unicode.Boxes.Curved.BottomRight,
            ]
        ].map((line) => line.join(''))
    }
}

