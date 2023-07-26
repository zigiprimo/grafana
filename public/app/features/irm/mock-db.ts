import { useMachine } from '@xstate/react';
import { useEffect } from 'react';
import { createMachine, assign, InterpreterFrom, StateFrom } from 'xstate';

interface IrmMachineContext {
  events: Array<{
    id: string;
    type: 'incident' | 'detection';
    description: string;
    source?: string;
  }>;
}

type IrmMachineAction =
  | { type: 'LOAD' }
  | { type: 'RESET' }
  | { type: 'DECLARE_INCIDENT'; event: { id: string; type: 'incident'; description: string; source?: string } }
  | { type: 'NEW_DETECTION' };

type IrmMachineTypeState =
  | { value: { incidents: 'startup' | 'ready' }; context: IrmMachineContext }
  | { value: { detections: 'startup' | 'ready' }; context: IrmMachineContext };

/// Demonstration simulation
const irmMachine = createMachine<IrmMachineContext, IrmMachineAction, IrmMachineTypeState>({
  context: { events: [] },
  type: 'parallel',
  states: {
    incidents: {
      initial: 'startup',
      states: {
        startup: {
          on: {
            LOAD: [
              {
                target: 'ready',
                actions: assign({
                  events: (ctx, _) => [
                    ...ctx.events,
                    { id: '430129e1', type: 'incident', description: 'AWS West is down' },
                  ],
                }),
              },
            ],
          },
        },
        ready: {
          on: {
            RESET: { target: 'startup', actions: assign({ events: (_) => [] }) },
          },
        },
      },
    },
    detections: {
      initial: 'startup',
      states: {
        startup: {
          on: {
            LOAD: {
              target: 'ready',
              actions: assign({
                events: (ctx) => [
                  ...ctx.events,
                  {
                    id: '430129e1',
                    type: 'detection',
                    description: 'Alert Firing for 10 minutes',
                    source: 'alert-group',
                  },
                  {
                    id: 'f1728723',
                    type: 'detection',
                    description: 'Customer reports outage',
                    source: 'customer-support',
                  },
                ],
              }),
            },
          },
        },
        ready: {
          on: {
            RESET: { target: 'startup', actions: assign({ events: (_) => [] }) },
            DECLARE_INCIDENT: {
              actions: assign({
                events: (ctx, e) =>
                  ctx.events.map((x) => (x.id === e.event.id ? { ...x, ...e.event, type: 'incident' } : x)),
              }),
            },
            NEW_DETECTION: [
              {
                actions: assign({
                  events: (ctx) => [
                    ...ctx.events,
                    {
                      id: '7ab34783',
                      type: 'detection',
                      description: 'CVE-1238-17 Vulnerability in corelib',
                      source: 'cve-feed',
                    },
                  ],
                }),
              },
            ],
          },
        },
      },
    },
  },
});

export type IrmState = StateFrom<typeof irmMachine>;
export type IrmDispatch = InterpreterFrom<typeof irmMachine>['send'];

/// A little demo function
export function useIncidents() {
  const [state, send] = useMachine(irmMachine);
  useEffect(() => {
    send('RESET');
    setTimeout(() => {
      send('LOAD');
    }, 500);
  }, [send]);
  return [state.context.events.filter((x) => x.type === 'incident'), state.matches({ incidents: 'startup' })] as const;
}

/// A little demo function
export function useDetections() {
  const [state, send] = useMachine(irmMachine);
  useEffect(() => {
    send('RESET');
    setTimeout(() => {
      send('LOAD');
    }, 500);
    setTimeout(() => {
      // simulate a new detection popping in
      send('NEW_DETECTION');
    }, 6000);
  }, [send]);
  return [
    state.context.events.filter((x) => x.type === 'detection'),
    state.matches({ detections: 'startup' }),
  ] as const;
}

export function useSchedules() {
  return [[], false] as const;
}
