
import { MAX_LOOPS } from '../../Constants.js'
import {
    SCAN, COMM, JUMP, HALT, ERR,
    PUSH, DUP, POP, SWAP, ROT,
    NEG, ADD, SUB, MUL, DIV, MOD,
    EQ, NE, LT, LE, GT, GE,
    NOT, AND, OR,
    GET, PUT,
    EQZ, ANY,
    TRUE, FALSE,
} from '../../ISA.js'

import { MachineState } from './MachineState.js'

export function *run (program, input, output) {

    let machine = MachineState.initialState();

    // execute until we hit the end, or an error
    while (machine.isRunning()) {

        // ---------------------------------------------------------------------
        // Decode the instruction
        // ---------------------------------------------------------------------
        let instruction = program[machine.ip];
        let [ st, op, data, tm, retain ] = instruction;

        let temp;

        // ---------------------------------------------------------------------
        // Apply state changes
        // ---------------------------------------------------------------------
        switch (st) {
        case HALT:
            // the next loop will halt the system
            break;
        case JUMP:
            switch (op) {
            case ANY:
                // unconditional jump, just goto the IP based on TM
                break;
            case EQZ:
                // conditional jump, just goto the IP if zero
                tm = machine.checkIfZero() ? tm : 1;
                break;
            default:
                // if we don't know the op, then we should halt and complain!
                st = ERR;
                break;
            }
            break;
        case COMM:
            switch (op) {
            case GET:
                temp = machine.PUSH(input.shift());
                break;
            case PUT:
                temp = machine.getValueAtTOS();
                output.push(temp);
                break;
            default:
                // if we don't know the op, then we should halt and complain!
                st = ERR;
                break;
            }
            break;
        case SCAN:
            // -----------------------------------------------------------------
            // Perform the operation
            // -----------------------------------------------------------------
            switch (op) {
            // ----------------------------------------------
            // stack ops ...
            // ----------------------------------------------
            // adds new values, so returns new temp
            case PUSH : temp = machine.PUSH(data); break;
            case DUP  : temp = machine.DUP();      break;
            // just alters the stack, no temp needed
            case POP  : machine.POP();  break;
            case SWAP : machine.SWAP(); break;
            case ROT  : machine.ROT();  break;
            // ----------------------------------------------
            // maths ...
            // ----------------------------------------------
            case NEG: temp = machine.UNOP((x) => -x); break;
            case ADD: temp = machine.BINOP((n, m) => n + m ); break;
            case SUB: temp = machine.BINOP((n, m) => n - m ); break;
            case MUL: temp = machine.BINOP((n, m) => n * m ); break;
            case DIV: temp = machine.BINOP((n, m) => n / m ); break;
            case MOD: temp = machine.BINOP((n, m) => n % m ); break;
            // ----------------------------------------------
            // comparison ...
            // ----------------------------------------------
            case EQ: temp = machine.BINOP((n, m) => n == m ? TRUE : FALSE); break;
            case NE: temp = machine.BINOP((n, m) => n != m ? TRUE : FALSE); break;
            case LT: temp = machine.BINOP((n, m) => n <  m ? TRUE : FALSE); break;
            case LE: temp = machine.BINOP((n, m) => n <= m ? TRUE : FALSE); break;
            case GT: temp = machine.BINOP((n, m) => n >  m ? TRUE : FALSE); break;
            case GE: temp = machine.BINOP((n, m) => n >= m ? TRUE : FALSE); break;
            // ----------------------------------------------
            // logical ...
            // ----------------------------------------------
            case NOT: temp = machine.UNOP((x) => x ? TRUE : FALSE); break;
            case AND: temp = machine.BINOP((n, m) => n && m ? TRUE : FALSE); break;
            case OR:  temp = machine.BINOP((n, m) => n || m ? TRUE : FALSE); break;
            // ----------------------------------------------
            default:
                // if we don't know the op, then we should halt and complain!
                st = ERR;
                break;
            }
            break;
        default:
            // if we don't know the state, then we should halt and complain!
            st = ERR;
            break;
        }

        // ---------------------------------------------------------------------
        // Write to the output
        // ---------------------------------------------------------------------
        yield [ temp, st, instruction, machine ]

        // ---------------------------------------------------------------------
        // Update system loop state
        // ---------------------------------------------------------------------
        machine.advance(st, tm);

        // go around the loop again, but
        // check the max loops for sanity
        if (machine.pc >= MAX_LOOPS) break;
    }
}

