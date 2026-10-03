import { CardType, ChooseCardsPrompt, GameError, GameMessage, PokemonCard, PowerType, Stage, State, StoreLike, WaitPrompt } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import {WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, DRAW_CARDS, REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

/** Keep in sync with board draw flight (~0.7s deck→stage + ~0.3s stage→hand). */
const DRAW_ANIMATION_WAIT_MS = 1100;

export class Jellicent extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Frillish';
  public cardType: CardType[] = [W];
  public hp: number = 120;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public powers = [{
    name: 'Deep Sea Draw',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'You may use this Ability once during your turn. Draw a card. If you do, you may then put a card from your hand at the bottom of your deck.'
  }];

  public attacks = [{
    name: 'Slap',
    cost: [W, C, C],
    damage: 100,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M6';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '20';
  public name: string = 'Jellicent';
  public fullName: string = 'Jellicent M6';

  public readonly DEEP_SEA_DRAW_MARKER = 'JELLICENT_DEEP_SEA_DRAW_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Deep Sea Draw
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.DEEP_SEA_DRAW_MARKER, this);
      ABILITY_USED(player, this);
      DRAW_CARDS(store, state, player, 1);

      if (player.hand.cards.length === 0) {
        return state;
      }

      return store.prompt(state, new WaitPrompt(player.id, DRAW_ANIMATION_WAIT_MS, 'Draw animation', false), () => {
        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ON_BOTTOM,
          player.hand,
          {},
          { min: 0, max: 1, allowCancel: true },
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.hand, player.deck, { cards: [cards[0]], sourceCard: this });
          }
        });
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.DEEP_SEA_DRAW_MARKER, this);

    return state;
  }
}
