
const MAX_LOOPS = 64

const fmt = (n, w = 2, s = '0') => n.toString().padStart(w, s)


let program1 = [
    [ 'SCAN', 2,       1,  1, false ],
    [ 'SCAN', 'DUP',   1,  1, false ],
    [ 'SCAN', '+',     1,  1, false ],
    [ 'JUMP', null,   -2,  0, false ],
    [ 'HALT', null,    0,  0, false ],
];


// 1) state
// 1) operation
// 2) tape move
// 3) stack adjust/move
// 4) retain value

let program = [
    [ 'SCAN',  10,     1,  1, false ],
    [ 'SCAN',  'DUP',  1,  1, false ],
    [ 'SCAN',  'DUP',  1,  1, true  ],
    [ 'SCAN',  1,      1,  1, false ],
    [ 'SCAN',  '-',    1,  1, false ],
    [ 'SCAN',  'DUP',  1,  1, false ],
    [ 'SCAN',  1,      1,  1, false ],
    [ 'SCAN',  '==',   1,  1, false ],
    [ 'JUMPZ', null,  -7, -3, false ],
    [ 'HALT',  null,   0,  1, false ],
];

let output = [];

let state = 'SCAN'
let pc    = 0;
let ip    = 0;
let sp    = 0;
let tos   = sp;

while (state != 'HALT') {
    let [ st, op, tm, sm, keep ] = program[ip];

    switch (st) {
    case 'HALT':
        state = st;
        continue;
    case 'JUMP':
        ip += tm;
        console.log(`>>>> JUMP IP(${fmt(ip)}) SP(${fmt(sp)})`);
        continue;
    case 'JUMPZ':
        ip += output[sp][0] == 0 ? tm : 1;
        console.log(`>>>> JUMPZ (${output[sp][0]}) IP(${fmt(ip)}) SP(${fmt(sp)}) => SP(${fmt(sp + sm)})`);
        tos += sm;
        continue;
    }

    let result = op;
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

    sp += sm;
    ip += tm;
    pc += 1;
    tos = sp;

    output[pc] = [ result, keep, state, ip, tos, sp ];

    if (pc >= MAX_LOOPS) break;
}

let results = output.filter((log) => log[1]);

console.log(results);

