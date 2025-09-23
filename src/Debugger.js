
import { SCAN, COMM, JUMP, HALT, ERR, ___, TRUE, FALSE, } from './ISA.js'

export const DIVIDER   = '-'.repeat(120);

export const fmt = (n, w = 2, s = '0', atEnd = false, nullRepr = 'NULL') =>
    (atEnd
        ? (_st, _w, _s) => _st.padEnd(_w, _s)
        : (_st, _w, _s) => _st.padStart(_w, _s)
    )((n == null ? nullRepr : n.toString()), w, s)

export function runPrograms (machineBuilder, programs) {
    programs.forEach((bundle) => {
        let [ name, program, input, output, filter ] = bundle;

        let machine = machineBuilder(program, input, output);

        displayProgram(name, program);
        displayRuntimeHeader(name);
        let log = [];
        for (const entry of machine.run()) {
            displayMachineState(entry);
            log.push(entry);
        }
        displayRuntimeFooter();
        displayProgramResults(name, log, input, output, filter ?? true );
    });
}


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
    let [ temp, st, instruction, machine ] = state;
    let op = instruction[1];

    switch (st) {
    case HALT:
        console.log(`${fmt(machine.pc, 5)} HALT [!!!!!!] [!!!!!!] IP(${fmt(machine.ip)}) : TOS(${fmt(machine.pc)})`);
        console.log('='.repeat(45));
        break;
    case ERR:
        console.log('!'.repeat(45));
        console.log(`${fmt(machine.pc, 5)} ERR  [${fmt(op, 15, ' ')}] IP(${fmt(machine.ip)}) : TOS(${fmt(machine.pc)})`);
        console.log('!'.repeat(45));
        break;
    case JUMP:
        console.log('-'.repeat(45));
        console.log(`${fmt(machine.pc, 5)} JUMP [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(machine.ip)}) : TOS(${fmt(machine.pc)})`);
        console.log('-'.repeat(45));
        break;
    case COMM:
        console.log('-'.repeat(45));
        console.log(`${fmt(machine.pc, 5)} COMM [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(machine.ip)}) : TOS(${fmt(machine.pc)})`);
        console.log('-'.repeat(45));
        break;
    case SCAN:
        console.log(`${fmt(machine.pc, 5)} SCAN [${fmt(op, 6, ' ')}] [${fmt(temp, 6, ' ')}] IP(${fmt(machine.ip)}) : TOS(${fmt(machine.pc)}) [${machine.stack.join(', ')}]`);
        break;
    }
}

export function displayProgramResults (name, log, input, output, filter) {
    console.log(DIVIDER);
    console.log(`Program Results := ${name}`)
    console.group(DIVIDER);
    if (Array.isArray(input))  console.log('INPUT:', input.join(','));
    if (Array.isArray(output)) console.log('OUTPUT:', output.join(', '));
    console.log('+-------+--------+--------+--------+--------+--------+--------+--------+');
    console.log('| STACK |    TOS |   RHS  |    LHS |  STATE |     OP |     IP |  KEEP? |');
    console.log('+-------+--------+--------+--------+--------+--------+--------+--------+');
    log
    .forEach((row) => {
        let [ temp, st, instruction, machine ] = row;
        let [ _st, op, data, tm, retain ] = instruction;
        if (filter && retain != TRUE) return;
        console.log('|' + [ temp, machine.pc, machine.stack.at(-1), machine.stack.at(-2), st, op, machine.ip, retain ].map((v) => fmt(v, 6, ' ')).join(' | ') + ' |')
    });
    console.log('+-------+--------+--------+--------+--------+--------+--------+--------+');
    console.groupEnd();
}
