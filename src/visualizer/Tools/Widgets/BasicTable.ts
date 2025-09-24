
import { View } from './Display';
import * as Unicode from './Unicode'

export type TableHeader = {
    label : string,
    width : number,
    // align : 'left' | 'right'
    // bgcolor, etc.
}

export type TableConfig = {
    headers : TableHeader[],
    data    : any[][],
    borders : {
        showOuter : boolean,
        showInner : boolean,
    }
}

export class Table implements View {
    public position   : [ number, number ];
    public dimensions : [ number, number ];
    public config     : TableConfig;

    constructor( position : [ number, number ], config : TableConfig) {
        //console.log(config.data);

        this.config     = config;
        this.position   = position;

        let showOuter = config.borders.showOuter;
        let showInner = config.borders.showInner;

        this.dimensions = [
            (
                (this.config.data.length + 1) // data + header
                + (showOuter
                    ? ((showInner ? this.config.data.length : 0) + 2) // each data item + top + footer
                    : 1 // one for the header divider
                )
            ),
            this.config.headers.reduce(
                (acc, h) => acc += h.width + (showOuter ? 1 : 0),
                1
            )
        ]
    }

    private buildHeaderRows () : string[] {
        let showOuter = this.config.borders.showOuter;
        let showInner = this.config.borders.showInner;

        let rows = [
            [ Unicode.Boxes.Curved.TopLeft ],
            [ Unicode.Boxes.Vertical       ],
        ];

        this.config.headers.forEach((header, headerIdx) => {
            rows[0].push(Unicode.Boxes.Horizontal.repeat(header.width));
            rows[1].push(header.label.padEnd(header.width));

            if ((headerIdx + 1) == this.config.headers.length) {
                rows[0].push(Unicode.Boxes.Curved.TopRight);
                rows[1].push(Unicode.Boxes.Vertical);
            } else {
                rows[0].push(Unicode.Boxes.TopDivider);
                rows[1].push(Unicode.Boxes.Vertical);
            }
        });

        if (!showOuter) {
            rows.shift();
            rows[0].shift();
            rows[0].pop();
        }

        return rows.map((line) => line.join(''));
    }

    private buildDataRows () : string[] {
        let showOuter = this.config.borders.showOuter;
        let showInner = this.config.borders.showInner;

        return this.config.data.map((rowData, rowIdx) => {
            let rows = [
                [ Unicode.Boxes.LeftDivider    ],
                [ Unicode.Boxes.Vertical       ],
            ];

            this.config.headers.forEach((header, headerIdx) => {
                let cellData = rowData[headerIdx];

                rows[0].push(Unicode.Boxes.Horizontal.repeat(header.width));
                rows[1].push(cellData.toString().padEnd(header.width));

                if ((headerIdx + 1) == this.config.headers.length) {
                    rows[0].push(Unicode.Boxes.RightDivider);
                    rows[1].push(Unicode.Boxes.Vertical);
                } else {
                    rows[0].push(Unicode.Boxes.MiddleDivider);
                    rows[1].push(Unicode.Boxes.Vertical);
                }
            });

            if (!showOuter) {
                rows[0].shift();
                rows[0].pop();
                rows[1].shift();
                rows[1].pop();
            }

            if (!showInner && rowIdx > 0) {
                rows.shift();
            }

            return rows.map((line) => line.join(''));
        }).flat(1)
    }

    private buildFooterRows () : string[] {
        let showOuter = this.config.borders.showOuter;
        let showInner = this.config.borders.showInner;

        if (!showOuter) return [];

        let row = [
            Unicode.Boxes.Curved.BottomLeft,
        ];

        this.config.headers.forEach((header, headerIdx) => {
            row.push(Unicode.Boxes.Horizontal.repeat(header.width));

            if ((headerIdx + 1) == this.config.headers.length) {
                row.push(Unicode.Boxes.Curved.BottomRight);
            } else {
                row.push(Unicode.Boxes.BottomDivider);
            }
        })

        return [ row.join('') ];
    }


    get scanlines () : string[] {
        return [
            ...this.buildHeaderRows(),
            ...this.buildDataRows(),
            ...this.buildFooterRows(),
        ]
    }
}

