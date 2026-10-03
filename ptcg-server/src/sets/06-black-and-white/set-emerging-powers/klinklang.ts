import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';

export class Klinklang extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Klang';
  public cardType: CardType[] = [M];
  public hp: number = 150;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Charge Beam',
    cost: [M],
    damage: 30,
    text: 'Attach an Energy card from your discard pile to this Pokémon.'
  }, {
    name: 'Zap Cannon',
    cost: [M, C, C],
    damage: 80,
    text: 'Flip a coin. If tails, this Pokémon can\'t use Zap Cannon during your next turn.'
  }];

  public set: string = 'EPO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';
  public name: string = 'Klinklang';
  public fullName: string = 'Klinklang EPO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergy = player.discard.cards.some(c => c.superType === SuperType.ENERGY);

      if (hasEnergy) {
        return store.prompt(state, new ChooseCardsPrompt(
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
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(player, this.attacks[1]);
        }
      });
    }

    return state;
  }
}
