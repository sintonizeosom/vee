
import { ProjectState } from '../types';

export interface HistoryState {
  past: ProjectState[];
  present: ProjectState;
  future: ProjectState[];
  grouping: boolean;
}

export const ActionType = {
  SET: 'SET',
  UNDO: 'UNDO',
  REDO: 'REDO',
  START_INTERACTION: 'START_INTERACTION',
  END_INTERACTION: 'END_INTERACTION',
  REPLACE_HISTORY: 'REPLACE_HISTORY',
};

export function historyReducer(state: HistoryState, action: { type: string, payload?: any }): HistoryState {
  const { past, present, future, grouping } = state;

  switch (action.type) {
    case ActionType.SET: {
      const newPresent = action.payload(present);
      if (JSON.stringify(newPresent) === JSON.stringify(present)) {
        return state;
      }
      
      if (grouping) {
        // If we are grouping, replace the current state instead of adding a new one to past.
        return { ...state, present: newPresent };
      }

      return {
        past: [...past, present],
        present: newPresent,
        future: [],
        grouping: false,
      };
    }
    case ActionType.REPLACE_HISTORY: {
      return action.payload;
    }
    case ActionType.START_INTERACTION: {
      if (grouping) return state; // Already grouping
      // Commit the current state to history before starting the interaction changes
      return {
        ...state,
        past: [...past, present],
        future: [],
        grouping: true
      };
    }
    case ActionType.END_INTERACTION: {
      return { ...state, grouping: false };
    }
    case ActionType.UNDO: {
      if (past.length === 0) return state;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
        grouping: false,
      };
    }
    case ActionType.REDO: {
      if (future.length === 0) return state;
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
        grouping: false,
      };
    }
    default:
      return state;
  }
}
