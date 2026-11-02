import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { CardTarget, GameMessage, PlayerType, PowerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_PROMPT, CONFIRMATION_PROMPT, DISCARD_A_STADIUM_CARD_IN_PLAY, IS_POKEBODY_BLOCKED, PREVENT_AND_CLEAR_SPECIAL_CONDITIONS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Steelix2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Onix';
  public hp: number = 140;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Perfect Metal',
    powerType: PowerType.POKEBODY,
    text: 'Steelix can\'t be affected by any Special Conditions'
  }];

  public attacks = [{
    name: 'Energy Stream',
    cost: [C, C],
    damage: 30,
    text: 'Search your discard pile for an Energy card and attach it to Steelix.'
  },
  {
    name: 'Gaia Crush',
    cost: [M, M, C, C, C],
    damage: 100,
    text: 'You may discard any Stadium card in play.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '87';
  public name: string = 'Steelix';
  public fullName: string = 'Steelix UL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Perfect Metal
    PREVENT_AND_CLEAR_SPECIAL_CONDITIONS(state, effect, {
      shouldApply: (target, owner) => {
        return target.getPokemonCard() === this && !IS_POKEBODY_BLOCKED(store, state, owner, this);
      }
    });

    // Energy Stream
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (!player.discard.cards.some(card => card.superType === SuperType.ENERGY)) {
        return state;
      }
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (!list.cards.includes(this)) {
          blockedTo.push(target);
        }
      });
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DISCARD,
        [SlotType.ACTIVE, SlotType.BENCH],
        {},
        { allowCancel: false, min: 1, max: 1, blockedTo }
      );
    }

    // Gaia Crush
    if (WAS_ATTACK_USED(effect, 1, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, wantTo => {
        if (wantTo) {
          DISCARD_A_STADIUM_CARD_IN_PLAY(state);
        }
      }, GameMessage.WANT_TO_DISCARD_STADIUM);
    }

    return state;
  }
}
