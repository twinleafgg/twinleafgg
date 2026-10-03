import { Action } from '../game/store/actions/action';
import { State } from '../game';
import { Client } from '../game/client/client.interface';
import { Game } from '../game/core/game';
import { SimpleBotOptions } from '../simple-bot/simple-bot-options';
import { ActionSearchAi } from './action-search-ai';
import { config } from '../config';

export class AdvancedGameHandler {

  private ai: ActionSearchAi | undefined;
  private state: State | undefined;
  private changeInProgress: boolean = false;

  constructor(
    private client: Client,
    private options: SimpleBotOptions,
    public game: Game,
    deckPromise: Promise<string[]>
  ) {
    this.waitForDeck(deckPromise);
  }

  public async onStateChange(state: State): Promise<void> {
    if (!this.ai || this.changeInProgress) {
      this.state = state;
      return;
    }

    this.state = undefined;
    this.changeInProgress = true;

    const action = this.ai.decodeNextAction(state);
    if (action) {
      await this.waitAndDispatch(action);
    }

    this.changeInProgress = false;
    if (this.state) {
      this.onStateChange(this.state);
    }
  }

  private async waitForDeck(deckPromise: Promise<string[]>): Promise<void> {
    let deck: string[] | null = null;
    try {
      deck = await deckPromise;
    } catch {
      // continue regardless of error
    }

    this.ai = new ActionSearchAi(this.client, this.options, deck);

    if (this.state) {
      this.onStateChange(this.state);
    }
  }

  private waitAndDispatch(action: Action): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          this.game.dispatch(this.client, action);
        } catch {
          // continue regardless of error
        }
        resolve();
      }, config.bots.actionDelay);
    });
  }

}
