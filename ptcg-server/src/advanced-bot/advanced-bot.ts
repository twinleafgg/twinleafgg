import { BotClient } from '../game/bots/bot-client';
import { Client } from '../game/client/client.interface';
import { Game } from '../game/core/game';
import { AdvancedGameHandler } from './advanced-game-handler';
import { State } from '../game/store/state/state';
import { User, Message } from '../storage';
import { SimpleBotOptions } from '../simple-bot/simple-bot-options';
import { Format } from '../game/store/card/card-types';
import { defaultAdvancedBotOptions } from './advanced-bot-definitions';
import { HEDRICK_DRAGAPULT_WORLDS_2026 } from './knowledge/decks/hedrick-dragapult-worlds-2026';

/**
 * Standard-format advanced bot that plays Hedrick's Worlds 2026 Dragapult list
 * using intra-turn action search + Crushing Hammer Dragapult playbook knowledge.
 */
export class AdvancedBot extends BotClient {

  protected gameHandlers: AdvancedGameHandler[] = [];
  private options: SimpleBotOptions;

  constructor(name: string, options: Partial<SimpleBotOptions> = {}) {
    super(name, [Format.STANDARD]);
    this.options = Object.assign({}, defaultAdvancedBotOptions, options);
    this.setDeck(Format.STANDARD, HEDRICK_DRAGAPULT_WORLDS_2026);
  }

  public onConnect(client: Client): void { }

  public onDisconnect(client: Client): void { }

  public onUsersUpdate(users: User[]): void {
    const me = users.find(u => u.id === this.user.id);
    if (me !== undefined) {
      this.user = me;
    }
  }

  public onMessage(from: Client, message: Message): void { }

  public onMessageRead(user: User): void { }

  public onGameJoin(game: Game, client: Client): void {
    if (client === this) {
      const state = game.state;
      this.addGameHandler(game);
      this.onStateChange(game, state);
    }
  }

  public onGameLeave(game: Game, client: Client): void {
    const gameHandler = this.gameHandlers.find(gh => gh.game === game);

    if (client === this && gameHandler !== undefined) {
      this.deleteGameHandler(gameHandler);
      return;
    }
  }

  public onGameAdd(game: Game): void { }

  public onGameDelete(game: Game): void { }

  public onStateChange(game: Game, state: State): void {
    const gameHandler = this.gameHandlers.find(handler => handler.game === game);
    if (gameHandler !== undefined) {
      gameHandler.onStateChange(state);
    }
  }

  /** Prefer the curated Hedrick list over random DB decks. */
  public async loadDeck(): Promise<string[]> {
    const curated = await this.getDeck(Format.STANDARD);
    if (curated && curated.length === 60) {
      return curated;
    }
    return super.loadDeck();
  }

  protected addGameHandler(game: Game): AdvancedGameHandler {
    const gameHandler = new AdvancedGameHandler(this, this.options, game, this.loadDeck());
    this.gameHandlers.push(gameHandler);
    return gameHandler;
  }

  protected deleteGameHandler(gameHandler: AdvancedGameHandler): void {
    const index = this.gameHandlers.indexOf(gameHandler);
    if (index !== -1) {
      this.gameHandlers.splice(index, 1);
    }
  }

}
