import {
  Action, AttackAction, GamePhase, InvitePlayerPrompt, PassTurnAction,
  Player, Prompt, ResolvePromptAction, State, StateLog, GameLog
} from '../game';
import { Client } from '../game/client/client.interface';
import { Simulator } from '../game/bots/simulator';
import { SimpleBotOptions } from '../simple-bot/simple-bot-options';
import { StateScore } from '../simple-bot/state-score/state-score';
import { PromptResolver } from '../simple-bot/prompt-resolver/prompt-resolver';
import { ActionEnumerator } from './action-enumerator';
import { DragapultPlaybook } from './knowledge/playbooks/dragapult-playbook';

const BEAM_WIDTH = 4;
const MAX_DEPTH = 3;

interface ScoredAction {
  action: Action;
  score: number;
  endsTurn: boolean;
}

export class ActionSearchAi {

  private resolvers: PromptResolver[];
  private enumerator = new ActionEnumerator();
  private stateScore: StateScore;
  private playbook = new DragapultPlaybook();

  constructor(
    private client: Client,
    private options: SimpleBotOptions,
    private deck: string[] | null
  ) {
    this.resolvers = options.promptResolvers.map(resolver => new resolver(options));
    this.stateScore = new StateScore(options);
  }

  public decodeNextAction(state: State): Action | undefined {
    let player: Player | undefined;
    for (let i = 0; i < state.players.length; i++) {
      if (state.players[i].id === this.client.id) {
        player = state.players[i];
      }
    }

    if (player === undefined) {
      return;
    }

    if (state.prompts.length > 0) {
      const prompt = state.prompts.find(p => p.playerId === player!.id && p.result === undefined);
      if (prompt !== undefined) {
        return this.resolvePrompt(player, state, prompt);
      }
    }

    if (state.prompts.filter(p => p.result === undefined).length > 0) {
      return;
    }

    const activePlayer = state.players[state.activePlayer];
    const isMyTurn = activePlayer.id === this.client.id;
    if (state.phase === GamePhase.PLAYER_TURN && isMyTurn) {
      return this.searchBestAction(player, state);
    }
  }

  private searchBestAction(player: Player, state: State): Action {
    const root = this.evaluateCandidates(state, player, 0);
    if (root.length === 0) {
      return new PassTurnAction(this.client.id);
    }

    // Prefer non-pass when scores are close and we have setup actions
    root.sort((a, b) => b.score - a.score);
    return root[0].action;
  }

  private evaluateCandidates(state: State, player: Player, depth: number): ScoredAction[] {
    const candidates = this.enumerator.enumerate(state, player, this.client.id);
    const scored: ScoredAction[] = [];

    for (const action of candidates) {
      const result = this.simulateAndScore(state, player.id, action);
      if (result === undefined) {
        continue;
      }
      scored.push(result);
    }

    scored.sort((a, b) => b.score - a.score);
    const beam = scored.slice(0, BEAM_WIDTH);

    if (depth >= MAX_DEPTH - 1) {
      return beam;
    }

    // Look ahead within the same turn for non-terminating actions
    const refined: ScoredAction[] = [];
    for (const item of beam) {
      if (item.endsTurn || item.action instanceof PassTurnAction || item.action instanceof AttackAction) {
        refined.push(item);
        continue;
      }

      const nextState = this.simulateAction(state, item.action);
      if (!nextState) {
        refined.push(item);
        continue;
      }

      const nextPlayer = nextState.players.find(p => p.id === player.id);
      if (!nextPlayer || nextState.turn > state.turn || nextState.phase !== GamePhase.PLAYER_TURN) {
        refined.push(item);
        continue;
      }

      const childBest = this.evaluateCandidates(nextState, nextPlayer, depth + 1);
      if (childBest.length > 0) {
        // Keep the root action but use deeper leaf score
        refined.push({
          action: item.action,
          score: childBest[0].score,
          endsTurn: childBest[0].endsTurn
        });
      } else {
        refined.push(item);
      }
    }

    refined.sort((a, b) => b.score - a.score);
    return refined;
  }

  private simulateAndScore(state: State, playerId: number, action: Action): ScoredAction | undefined {
    const newState = this.simulateAction(state, action);
    if (!newState) {
      return undefined;
    }

    const newPlayer = newState.players.find(p => p.id === playerId);
    if (!newPlayer) {
      return undefined;
    }

    let score = this.stateScore.getScore(newState, playerId)
      + this.playbook.adjustScore(newState, playerId);

    const passTurnScore = this.options.scores.tactics.passTurn;
    const endsTurn = newState.turn > state.turn
      || action instanceof PassTurnAction
      || action instanceof AttackAction;

    if (endsTurn && !(action instanceof AttackAction)) {
      score += passTurnScore;
    }

    // Attack preference from playbook
    if (action instanceof AttackAction) {
      const snap = this.playbook.getSnapshot(state, this.getPlayer(state, playerId));
      score += this.playbook.preferAttack(action.name, snap);
      score += this.options.scores.tactics.attackBonus;
    }

    return { action, score, endsTurn };
  }

  private getPlayer(state: State, playerId: number): Player {
    return state.players.find(p => p.id === playerId)!;
  }

  private simulateAction(state: State, action: Action): State | undefined {
    try {
      const simulator = new Simulator(state, this.options.arbiter);
      let newState = simulator.dispatch(action);

      while (simulator.store.state.prompts.some(p => p.result === undefined)) {
        newState = simulator.store.state;
        const prompt = newState.prompts.find(p => p.result === undefined);
        if (prompt === undefined) {
          break;
        }
        const promptPlayer = newState.players.find(p => p.id === prompt.playerId);
        if (promptPlayer === undefined) {
          break;
        }
        const resolveAction = this.resolvePromptInner(newState, promptPlayer, prompt);
        newState = simulator.dispatch(resolveAction);
      }

      return newState;
    } catch {
      return undefined;
    }
  }

  public resolvePrompt(player: Player, state: State, prompt: Prompt<any>): Action {
    if (prompt instanceof InvitePlayerPrompt) {
      const result = this.deck;
      let log: StateLog | undefined;
      if (result === null) {
        log = new StateLog(GameLog.LOG_TEXT, {
          text: 'Sorry, my deck is not ready.'
        }, player.id);
      }
      return new ResolvePromptAction(prompt.id, result, log);
    }

    return this.resolvePromptInner(state, player, prompt);
  }

  private resolvePromptInner(state: State, player: Player, prompt: Prompt<any>): Action {
    for (let i = 0; i < this.resolvers.length; i++) {
      const action = this.resolvers[i].resolvePrompt(state, player, prompt);
      if (action !== undefined) {
        return action;
      }
    }
    return new ResolvePromptAction(prompt.id, null);
  }

}
