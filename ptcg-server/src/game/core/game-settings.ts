import { Format } from '../store/card/card-types';
import { Rules } from '../store/state/rules';

export class GameSettings {

  rules: Rules = new Rules();

  timeLimit: number = 1200;

  recordingEnabled: boolean = true;

  format: Format = Format.STANDARD;

  sandboxMode: boolean = false;

  /** When sandboxMode: any Pokémon may be played onto an empty Bench slot as if Basic (setup + in-game). */
  sandboxAllPokemonBasic: boolean = false;

  /** When sandboxMode: attacks ignore Energy costs (payment checks see cost []). */
  sandboxAttacksCostNoEnergy: boolean = false;

  /** When sandboxMode: retreat ignores Energy costs. */
  sandboxRetreatCostsNoEnergy: boolean = false;

  /** One connection controls both seats (second player uses a synthetic client id). */
  selfPlay: boolean = false;

  /** Opt-in undo for custom/invite/self-play/bot games (never matchmaking). */
  undoEnabled: boolean = false;

  /** When undoEnabled: allow undoing past the start of the current turn (cooperative). */
  deepUndoEnabled: boolean = false;

}

/** Normalize socket/API payloads into a full {@link GameSettings} instance. */
export function coerceGameSettings(raw: GameSettings | Partial<GameSettings> | undefined | null): GameSettings {
  const settings = new GameSettings();
  if (raw != null) {
    Object.assign(settings, raw);
  }
  settings.rules = new Rules(raw?.rules ?? {});
  if (raw != null && raw.recordingEnabled !== undefined && raw.recordingEnabled !== null) {
    settings.recordingEnabled = !!raw.recordingEnabled;
  } else {
    settings.recordingEnabled = true;
  }
  settings.undoEnabled = raw?.undoEnabled === true;
  settings.deepUndoEnabled = settings.undoEnabled && raw?.deepUndoEnabled === true;
  return settings;
}
