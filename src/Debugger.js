
import { SCAN, JUMP, HALT, ERR, ___, TRUE, FALSE, } from './ISA.js'

export const DIVIDER   = '-'.repeat(120);

export const fmt = (n, w = 2, s = '0', atEnd = false, nullRepr = 'NULL') =>
    (atEnd
        ? (_st, _w, _s) => _st.padEnd(_w, _s)
        : (_st, _w, _s) => _st.padStart(_w, _s)
    )((n == null ? nullRepr : n.toString()), w, s)


export function displayProgram (name, program) {
    console.log(DIVIDER);
    console.log(`Loading Program := ${name}`)
    console.group(DIVIDER)
    console.log('+-------+--------+--------+--------+--------+');
    console.log('| STATE |     OP |   DATA | T(+/-) |  HEAP? |');
    console.log('+-------+--------+--------+--------+--------+');
    program.forEach((row, idx) => {
        console.log('|' + row.map((v) => fmt(v, 6, ' ', false, '______')).join(' | ') + ' |')
    });
    console.log('+-------+--------+--------+--------+--------+');
    console.groupEnd();
}


export function displayRuntimeHeader (name) {
    console.log(DIVIDER);
    console.log(`Running Program := ${name}`)
    console.group(DIVIDER);
}

export function displayRuntimeFooter() {
    console.groupEnd();
}

export function displayMachineState (state) {
    let [ temp, st, pc, ip, instruction, shadow ] = state;
    let op = instruction[1];

    switch (st) {
    case HALT:
        console.log(`${fmt(pc, 5)} HALT [!!!!!!] [!!!!!!] IP(${fmt(ip)}) : TOS(${fmt(pc)})`);
        console.log('='.repeat(45));
        break;
    case ERR:
        console.log('!'.repeat(45));
        console.log(`${fmt(pc, 5)} ERR  [${fmt(op, 15, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(pc)})`);
        console.log('!'.repeat(45));
        break;
    case JUMP:
        console.log('-'.repeat(45));
        console.log(`${fmt(pc, 5)} JUMP [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(pc)})`);
        console.log('-'.repeat(45));
        break;
    case SCAN:
        console.log(`${fmt(pc, 5)} SCAN [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(pc)}) [${shadow.toArray().join(', ')}]`);
        break;
    }
}

export function displayProgramResults (name, output, filter = true) {
    console.log(DIVIDER);
    console.log(`Program Results := ${name}`)
    console.group(DIVIDER);
    console.log('+-------+--------+--------+--------+--------+--------+--------+--------+');
    console.log('| STACK |    TOS |   RHS  |    LHS |  STATE |     OP |     IP |  KEEP? |');
    console.log('+-------+--------+--------+--------+--------+--------+--------+--------+');
    output
    .forEach((row) => {
        let [ temp, st, pc, ip, instruction, shadow ] = row;
        let [ _st, op, data, tm, retain ] = instruction;
        if (filter && retain != TRUE) return;
        console.log('|' + [ temp, pc, shadow.rhs(), shadow.lhs(), st, op, ip, retain ].map((v) => fmt(v, 6, ' ')).join(' | ') + ' |')
    });
    console.log('+-------+--------+--------+--------+--------+--------+--------+--------+');
    console.groupEnd();
}
