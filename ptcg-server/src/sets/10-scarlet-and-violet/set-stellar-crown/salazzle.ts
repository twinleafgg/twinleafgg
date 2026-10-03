import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ADD_MARKER, HAS_MARKER, IS_ABILITY_BLOCKED, JUST_EVOLVED, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';

export class Salazzle extends PokemonCard {
  public regulationMark = 'H';
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Salandit';
  public cardType: CardType[] = [R];
  public hp: number = 120;
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    name: 'Sudden Scorching',
    cost: [C, C],
    damage: 0,
    text: 'Your opponent discards a card from their hand. If this Pokémon evolved from Salandit during this turn, your opponent discards 2 more cards.'
  },
  {
    name: 'Flamethrower',
    cost: [R, C, C],
    damage: 130,
    text: 'Discard an Energy from this Pokémon.'
  }];

  public set: string = 'SCR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '24';
  public name: string = 'Salazzle';
  public fullName: string = 'Salazzle SCR';

  public readonly SUDDEN_SCORCHING_MARKER = 'SUDDEN_SCORCHING_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (JUST_EVOLVED(effect, this) && !IS_ABILITY_BLOCKED(store, state, effect.player, this)) {
      const player = effect.player;
      ADD_MARKER(this.SUDDEN_SCORCHING_MARKER, player, this);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.SUDDEN_SCORCHING_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const markerCount = HAS_MARKER(this.SUDDEN_SCORCHING_MARKER, player, this) ? 3 : 1;

      if (opponent.hand.cards.length < markerCount) {
        const cards = opponent.hand.cards;
        MOVE_CARDS(store, state, opponent.hand, player.discard, { cards: cards, sourceCard: this });
        return state;
      }

      store.prompt(state, new ChooseCardsPrompt(
        opponent,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        opponent.hand,
        {},
        { min: markerCount, max: markerCount, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
      });

      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
    }

    return state;
  }
}