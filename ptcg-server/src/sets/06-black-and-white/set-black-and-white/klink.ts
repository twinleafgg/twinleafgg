import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';

export class Klink extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 60;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Charge Beam',
    cost: [M],
    damage: 10,
    text: 'Flip a coin. If heads, attach an Energy card from your discard pile to this Pokémon.'
  }, {
    name: 'Bind',
    cost: [M, C, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'BLW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public name: string = 'Klink';
  public fullName: string = 'Klink BLW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
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
