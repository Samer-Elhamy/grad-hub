import fs from 'fs';
import path from 'path';

import type { PreferenceVector, SwipeRecord } from '../types/api';

interface RuntimeState {
  preferences?: PreferenceVector;
  swipeHistory?: SwipeRecord[];
}

const isTest = process.env.NODE_ENV === 'test';
const storePath =
  process.env.RUNTIME_STATE_PATH ??
  path.resolve(process.cwd(), '.data', 'runtime-state.json');

let loaded = false;
let state: RuntimeState = {};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadState(): RuntimeState {
  if (isTest) return {};
  if (loaded) return state;

  loaded = true;
  try {
    if (!fs.existsSync(storePath)) {
      state = {};
      return state;
    }
    state = JSON.parse(fs.readFileSync(storePath, 'utf8')) as RuntimeState;
  } catch (err) {
    console.warn('[runtime-state] Failed to read persisted state:', err);
    state = {};
  }
  return state;
}

function saveState(nextState: RuntimeState): void {
  if (isTest) return;

  state = {
    ...loadState(),
    ...nextState,
  };

  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.warn('[runtime-state] Failed to persist state:', err);
  }
}

export function loadPersistedPreferences(): PreferenceVector | null {
  const preferences = loadState().preferences;
  return preferences ? clone(preferences) : null;
}

export function persistPreferences(preferences: PreferenceVector): void {
  saveState({ preferences: clone(preferences) });
}

export function loadPersistedSwipeHistory(): SwipeRecord[] {
  const swipeHistory = loadState().swipeHistory;
  return swipeHistory ? clone(swipeHistory) : [];
}

export function persistSwipeHistory(records: SwipeRecord[]): void {
  saveState({ swipeHistory: clone(records) });
}
