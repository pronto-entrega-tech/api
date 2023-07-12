type StateMachineType = {
  [x: string]: { [x: string]: string };
};

export const newStateMachine = (machine: StateMachineType) => ({
  reduce: <T extends string>(status: T, action: string) => {
    const actions = machine[status];
    if (!actions) return undefined;

    return actions[action] as T;
  },
});
