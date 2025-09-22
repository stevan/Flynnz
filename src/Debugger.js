
import { MAX_LOOPS, ___, TRUE, FALSE, } from '../src/Constants.js'

import {
    SCAN, JUMP, HALT, ERR,
} from '../src/ISA.js'

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

export function displayMachineState (pc, ip, st, op, tos, temp, sstack) {
    switch (st) {
    case HALT:
        console.log(`${fmt(pc, 5)} HALT [!!!!!!] [!!!!!!] IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        console.log('='.repeat(45));
        break;
    case ERR:
        console.log('!'.repeat(45));
        console.log(`${fmt(pc, 5)} ERR  [${fmt(op, 15, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        console.log('!'.repeat(45));
        break;
    case JUMP:
        console.log('-'.repeat(45));
        console.log(`${fmt(pc, 5)} JUMP [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(tos)})`);
        console.log('-'.repeat(45));
        break;
    case SCAN:
        console.log(`${fmt(pc, 5)} SCAN [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(ip)}) : TOS(${fmt(tos)}) [${sstack.join(', ')}]`);
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
    .filter((row) => filter && row.at(-1) == TRUE)
    .forEach((row, idx) => {
        console.log('|' + row.map((v) => fmt(v, 6, ' ')).join(' | ') + ' |')
    });
    console.log('+-------+--------+--------+--------+--------+--------+--------+--------+');
    console.groupEnd();
}
