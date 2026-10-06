import { Card } from '../card/card';
import { State } from '../state/state';

export abstract class Prompt<T> {

  readonly abstract type: string;
  public id: number;
  public result: T | undefined;

  /**
   * When set, CardTarget BOTTOM/TOP and deck/prize ownership resolve relative to
   * this player instead of playerId. Used when one player answers prompts for
   * another player's effect (e.g. Hypno Hand Control).
   */
  public perspectivePlayerId?: number;

  /**
   * Card whose effect created this prompt (e.g. the Supporter/Item being resolved).
   * Set by Store when a trainer is resolving; serialized to the client for UI.
   */
  public sourceCard?: Card;

  constructor(public playerId: number) {
    this.id = 0;
  }

  /** Board / resource owner for this prompt (defaults to the answering player). */
  public getPerspectivePlayerId(): number {
    return this.perspectivePlayerId ?? this.playerId;
  }

  public decode(result: any, state: State): T | null {
    return result;
  }

  public validate(result: T | null, state: State): boolean {
    return true;
  }

}
