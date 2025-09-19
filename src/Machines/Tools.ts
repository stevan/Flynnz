
import { Immediate } from '../Machine'

// -----------------------------------------------------------------------------

export type Ticker = number; // counters
export type Index  = number; // indicies

export const initTicker = () : Ticker  =>  0 as Ticker;
export const initIndex  = () : Index   => -1 as Index;

// -----------------------------------------------------------------------------

export type StackCell = Immediate | undefined; // the stack can have undefined cells
export type Stack     = StackCell[];

export const initStack = (size : number) : Stack => Array(size).fill(undefined);
