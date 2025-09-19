
const MAX_LOOPS = 16

const fmt = (n, w = 2, s = '0') => n.toString().padStart(w, s)


let program = [
    [ 2,       1,  1, ],
    [ 'DUP',   1,  1, ],
    [ '+',     1,  1, ],
    [ 'JUMP', -2,  0, ],
    [ 'HALT',  0,  1, ],
];

let output = [];
let halt   = false;

let pc     = 0;
let ip     = 0;
let sp     = 0;

while (!halt) {
    let [ op, tm, sm ] = program[ip];

    let result;
    switch (op) {
    case 'HALT':
        halt = true;
        tm = -(ip + 1);
        break;
    case 'JUMP':
        ip += tm;
        [ op, tm, sm ] = program[ip];
        break;
    }

    switch (op) {
    case 'DUP':
        result = output[sp][0];
        break;
    case '+':
        result = output[sp - 1][0] + output[sp][0]
        break;
    case '*':
        result = output[sp - 1][0] * output[sp][0]
        break;
    default:
        result = op;
    }

    console.log(`${fmt(pc, 4)} [${fmt(op, 6, ' ')}] [${fmt(result, 6, ' ')}] IP(${fmt(ip)}) SP(${fmt(sp)})`);

    pc += 1;
    ip += tm;
    sp += sm;

    output[pc] = [ result, ip, sp ];

    if (pc >= MAX_LOOPS) break;
}

