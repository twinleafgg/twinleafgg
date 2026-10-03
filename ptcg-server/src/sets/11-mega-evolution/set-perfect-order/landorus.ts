import { PokemonCard, Stage, CardType, StoreLike, State, GameLog, ChooseCardsPrompt, GameMessage, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Landorus extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 120;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Rock Tumble',
    cost: [F, F],
    damage: 50,
    text: 'This attack\'s damage isn\'t affected by Resistance.'
  },
  {
    name: 'Screw Knuckle',
    cost: [F, F, C],
    damage: 120,
    text: 'Put an Energy card attached to this Pokémon to your hand.'
  }];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';
  public name: string = 'Landorus';
  public fullName: string = 'Landorus M3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rock Tumble - ignore resistance
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.ignoreResistance = true;
    }

    // Screw Knuckle - return energy to hand
    if (WAS_ATTACK_USED(effect, 1, this) && effect instanceof AttackEffect) {
      const player = effect.player;
      const energiesAttached = player.active.cards.filter(card =>
        card.superType === SuperType.ENERGY
      );

      if (energiesAttached.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.active,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          const energyToReturn = cards[0];
          store.log(state, GameLog.LOG_PLAYER_RETURNS_CARD_TO_HAND, {
            name: player.name,
            card: energyToReturn.name
          });
          MOVE_CARDS(store, state, player.active, player.hand, { cards: [energyToReturn], sourceCard: this });
        }
      });
    }

    return state;
  }
}
