import type { GameSettings } from 'ptcg-server';

/** Plain object for socket emit — ensures recording and rules survive JSON serialization. */
export function toGameSettingsPayload(settings: GameSettings): GameSettings {
  return {
    format: settings.format,
    timeLimit: settings.timeLimit,
    recordingEnabled: settings.recordingEnabled !== false,
    sandboxMode: settings.sandboxMode === true,
    sandboxAllPokemonBasic: settings.sandboxAllPokemonBasic === true,
    sandboxAttacksCostNoEnergy: settings.sandboxAttacksCostNoEnergy === true,
    sandboxRetreatCostsNoEnergy: settings.sandboxRetreatCostsNoEnergy === true,
    selfPlay: settings.selfPlay === true,
    undoEnabled: settings.undoEnabled === true,
    deepUndoEnabled: settings.undoEnabled === true && settings.deepUndoEnabled === true,
    rules: { ...settings.rules },
  } as GameSettings;
}
