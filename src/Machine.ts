
export interface StateTransition {}

export interface StateMachine<T extends StateTransition, U extends StateTransition> {
    step (trans : T) => U;
}


