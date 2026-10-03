import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Klang extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Klink';
  public cardType: CardType[] = [M];
  public hp: number = 80;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Charge Beam',
    cost: [C, C],
    damage: 20,
    text: 'Flip a coin. If heads, attach an Energy card from your discard pile to this Pokémon.'
  }, {
    name: 'Vice Grip',
    cost: [M, C, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'DEX';
  public setNumber: string = '76';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Klang';
  public fullName: string = 'Klang DEX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Charge Beam - flip a coin, if heads attach energy from discard
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergy = player.discard.cards.some(c => c.superType === SuperType.ENERGY);

      if (hasEnergy) {
        COIN_FLIP_PROMPT(store, state, player, result => {
          if (result) {
            store.prompt(state, new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_ATTACH,
              player.discard,
              { superType: SuperType.ENERGY },
              { min: 0, max: 1, allowCancel: false }
            ), cards => {
              cards = cards || [];
              if (cards.length > 0) {
                MOVE_CARDS(store, state, player.discard, player.active, { cards: cards, sourceCard: this });
              }
            });
          }
        });
      }
    }

    return state;
  }
}
