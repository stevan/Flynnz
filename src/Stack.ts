
import { Immediate } from './Bytecode'

export type StackCell = Immediate | undefined; // the stack can have undefined cells
export type Stack     = StackCell[];

export const initStack = (size : number) : Stack => Array(size).fill(undefined);
