import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { ConfirmPrompt, GameMessage, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Bouffalant extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 120;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Bouffant Head',
    cost: [C, C],
    damage: 30,
    text: 'During your opponent\'s next turn, this Pokémon takes 30 less damage from attacks (after applying Weakness and Resistance).'
  },
  {
    name: 'Knock Over',
    cost: [C, C, C],
    damage: 80,
    text: 'You may discard any Stadium card in play.'
  }];

  public set: string = 'BUS';
  public setNumber: string = '108';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Bouffalant';
  public fullName: string = 'Bouffalant BUS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bouffant Head
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.player.active.damageReductionNextTurn = 30;
    }

    // Knock Over
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);

      if (stadiumCard !== undefined) {
        store.prompt(state, new ConfirmPrompt(
          effect.player.id,
          GameMessage.WANT_TO_USE_ABILITY,
        ), wantToDiscard => {
          if (wantToDiscard) {
            const cardList = StateUtils.findCardList(state, stadiumCard);
            const owner = StateUtils.findOwner(state, cardList);
            MOVE_CARDS(store, state, cardList, owner.discard, { sourceCard: this });
          }
        });
      }
    }

    return state;
  }
}
