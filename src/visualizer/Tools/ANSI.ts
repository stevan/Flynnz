

export const ESC = '\x1b[';

export const HOME_CURSOR  = ESC + 'H';
export const CLEAR_SCREEN = ESC + '2J'

export const HIDE_CURSOR        = ESC + '?25l';
export const SHOW_CURSOR        = ESC + '?25h';

export const ENABLE_ALT_BUFFER  = ESC + '?1049h';
export const DISABLE_ALT_BUFFER = ESC + '?1049l';

const RESET  = ESC + '0m';
const BOLD   = ESC + '1m';
const DIM    = ESC + '2m';
const UNDER  = ESC + '4m';
const INVERT = ESC + '7m';
const STRIKE = ESC + '9m';

export const formatCarrigeReturn = (lineWidth : number) : string => {
    return `${ESC}B${ESC}${lineWidth}D`
}

export const formatCursorMove = (row : number, col : number) : string => {
    return `${ESC}${row};${col}H`
}

export namespace RGB {
    export const formatBgColor = (r : number, g : number, b : number) : string => {
        return `${ESC}48;2;${r};${g};${b};m`
    }

    export const formatFgColor = (r : number, g : number, b : number) : string => {
        return `${ESC}38;2;${r};${g};${b};m`
    }

    export const formatColor = (fgColor : number[], bgColor: number[]) : string =>  {
        let [ fr, fg, fb ] = fgColor;
        let [ br, bg, bb ] = bgColor;
        return `${ESC}38;2;${fr};${fg};${fb};48;2;${br};${bg};${bb};m`
    }
}


/*

## 8-16 colors

        NORMAL | BRIGHT
        FG  BG | FG  BG
Black   30  40 | 90  100
Red     31  41 | 91  101
Green   32  42 | 92  102
Yellow  33  43 | 93  103
Blue    34  44 | 94  104
Magenta 35  45 | 95  105
Cyan    36  46 | 96  106
White   37  47 | 97  107
Default 39  49 | --  ---

# Set style to bold, red foreground.
\x1b[1;31mHello

# Set style to dimmed white foreground with red background.
\x1b[2;37;41mWorld

## 256

ESC[38;5;{ID}m  Set foreground color.
ESC[48;5;{ID}m  Set background color.

ID = 0 - 255

  0-7   : standard colors (as in ESC [ 30–37 m)
  8–15  : high intensity colors (as in ESC [ 90–97 m)
 16-231 : 6 × 6 × 6 cube (216 colors)
232-255 : grayscale from dark to light in 24 steps.

## RGB

ESC[38;2;{r};{g};{b}m   Set foreground color as RGB.
ESC[48;2;{r};{g};{b}m   Set background color as RGB.

*/
