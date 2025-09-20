
const MAX_LOOPS = 64

const fmt = (n, w = 2, s = '0') => n.toString().padStart(w, s)


let program = [
    [ 2,       1,  1, ],
    [ 'DUP',   1,  1, ],
    [ '+',     1,  1, ],
    [ 'JUMP', -2,  0, ],
    [ 'HALT',  0,  1, ],
];


// 1) operation/state,
// 2) tape move
// 3) stack adjust/move
// ?) should retain this value yes/no? (is-temp)
//      - this might be better for calculating the real stack
//      - but might get messy to actually use, but could be
//      - used to compact the stack

let program1 = [
    [ 10,       1,  1  ],
    [ 'DUP',    1,  1  ],
    [ 1,        1,  1  ],
    [ '-',      1,  1  ],
    [ 'DUP',    1,  1  ],
    [ 1,        1,  1  ],
    [ '==',     1,  1  ],
    [ 'JUMPZ', -6, -3  ],
    [ 'HALT',   0,  1  ],
];

let output = [];

let halt   = false;
let pc     = 0;
let ip     = 0;
let sp     = 0;

while (!halt) {
    let [ op, tm, sm ] = program[ip];

    let tos    = sp;
    let result = op;

    switch (op) {
    case 'HALT':
        halt = true;
        continue;
    case 'JUMP':
        ip += tm;
        console.log(`>>>> JUMP IP(${fmt(ip)}) SP(${fmt(sp)})`);
        continue;
    case 'JUMPZ':
        ip += output[sp][0] == 0 ? tm : 1;
        console.log(`>>>> JUMPZ (${output[sp][0]}) IP(${fmt(ip)}) SP(${fmt(sp)}) => SP(${fmt(sm)})`);
        tos += sm;
        [ op, tm, sm ] = program[ip];
    }

    switch (op) {
    case 'DUP':
        result = output[tos][0];
        break;
    case '+':
        result = output[tos - 1][0] + output[tos][0]
        break;
    case '*':
        result = output[tos - 1][0] * output[tos][0]
        break;
    case '-':
        result = output[tos - 1][0] - output[tos][0]
        break;
    case '==':
        result = output[tos - 1][0] == output[tos][0] ? 1 : 0
        break;
    default:
        result = op;
    }

    console.log(`${fmt(pc, 4)} [${fmt(op, 6, ' ')}] [${fmt(result, 6, ' ')}] IP(${fmt(ip)}) TOS(${fmt(tos)}) SP(${fmt(sp)})`);

    ip += tm;
    sp += sm;
    pc += 1;

    output[pc] = [ result, ip, tos, sp ];

    if (pc >= MAX_LOOPS) break;
}

