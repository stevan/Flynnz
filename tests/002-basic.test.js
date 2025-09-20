
const MAX_LOOPS = 64

const fmt = (n, w = 2, s = '0') => n.toString().padStart(w, s)

const ___ = null;

const TRUE  = 1;
const FALSE = 0;

const SCAN = 'SCAN';
    const DUP = 'DUP';
    const POP = 'POP';

    const ADD = '+';
    const SUB = '-';
    const MUL = '*';
    const DIV = '/';
    const MOD = '%';

    const EQ = '==';
    const NE = '!=';
    const LT = '<';
    const LE = '<=';
    const GT = '>';
    const GE = '>=';

const JUMP  = 'JUMP';
const JUMPZ = 'JUMPZ';

const HALT = 'HALT';

let program1 = [
    [ SCAN, 2,      1,  1, FALSE ],
    [ SCAN, DUP,    1,  1, FALSE ],
    [ SCAN, ADD,    1,  1, FALSE ],
    [ JUMP, ___,   -2,  0, FALSE ],
    [ HALT, ___,    0,  0, FALSE ],
];


// 1) state
// 1) operation
// 2) tape move
// 3) stack adjust/move
// 4) retain value

let program = [
    [ SCAN,  10,    1,  1, FALSE ],
    [ SCAN,  DUP,   1,  1, FALSE ],
    [ SCAN,  1,     1,  1, FALSE ],
    [ SCAN,  SUB,   1,  1, FALSE ],
    [ SCAN,  DUP,   1,  1, TRUE  ],
    [ SCAN,  1,     1,  1, FALSE ],
    [ SCAN,  EQ,    1,  1, FALSE ],
    [ JUMPZ, ___,  -6, -3, FALSE ],
    [ HALT,  ___,   0,  1, FALSE ],
];

let output = [];

let state = SCAN
let pc    = 0;
let ip    = 0;
let sp    = 0;
let tos   = sp;

while (state != HALT) {
    let [ st, op, tm, sm, keep ] = program[ip];

    switch (st) {
    case HALT:
        state = st;
        continue;
    case JUMP:
        ip += tm;
        console.log(`>>>> JUMP IP(${fmt(ip)}) SP(${fmt(sp)})`);
        continue;
    case JUMPZ:
        ip += output[sp][0] == 0 ? tm : 1;
        console.log(`>>>> JUMPZ (${output[sp][0]}) IP(${fmt(ip)}) SP(${fmt(sp)}) => SP(${fmt(sp + sm)})`);
        tos += sm;
        continue;
    }

    let result = op;
    switch (op) {
    case DUP:
        result = output[tos][0];
        break;
    case POP:
        result = output[tos - 1][0];
        break;
    // math ...
    case ADD: result = output[tos - 1][0] + output[tos][0]; break;
    case SUB: result = output[tos - 1][0] - output[tos][0]; break;
    case MUL: result = output[tos - 1][0] * output[tos][0]; break;
    case DIV: result = output[tos - 1][0] / output[tos][0]; break;
    case MOD: result = output[tos - 1][0] % output[tos][0]; break;
    // comparison ...
    case EQ: result = output[tos - 1][0] == output[tos][0] ? TRUE : FALSE; break;
    case NE: result = output[tos - 1][0] != output[tos][0] ? TRUE : FALSE; break;
    case LT: result = output[tos - 1][0] <  output[tos][0] ? TRUE : FALSE; break;
    case LE: result = output[tos - 1][0] <= output[tos][0] ? TRUE : FALSE; break;
    case GT: result = output[tos - 1][0] >  output[tos][0] ? TRUE : FALSE; break;
    case GE: result = output[tos - 1][0] >= output[tos][0] ? TRUE : FALSE; break;
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

let results = output.filter((log) => log[1] == TRUE);

console.log(results);

