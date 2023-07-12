import { newStateMachine } from '~/common/functions/state-machine';

const machine = {
  oldState: {
    action: 'newState',
  },
};

describe('StateMachine', () => {
  const stateMachine = newStateMachine(machine);

  it('should return newState', () => {
    const newState = stateMachine.reduce('oldState', 'action');
    expect(newState).toEqual('newState');
  });

  it('should return undefined, given invalided action', () => {
    const newState = stateMachine.reduce('oldState', 'invalidedAction');
    expect(newState).toEqual(undefined);
  });

  it('should return undefined, given invalided state', () => {
    const newState = stateMachine.reduce('invalidedState', 'action');
    expect(newState).toEqual(undefined);
  });
});
