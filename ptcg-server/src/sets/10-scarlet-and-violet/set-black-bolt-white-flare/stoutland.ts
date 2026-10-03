import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType } from '../../../game/store/card/card-types';
import { GameMessage, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Stoutland extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Herdier';
  public cardType: CardType[] = [C];
  public hp: number = 160;
  public weakness = [{ type: F }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Odor Sleuth',
    cost: [C, C],
    damage: 0,
    text: 'Flip 3 coins. Put a number of cards up to the number of heads from your discard pile into your hand.'
  }, {
    name: 'Special Fang',
    cost: [C, C, C, C],
    damage: 100,
    damageCalculation: '+',
    text: 'If this Pokémon has any Special Energy attached, this attack does 100 more damage.'
  }];

  public regulationMark = 'I';

  public set: string = 'WHT';
  public setNumber: string = '76';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Stoutland';
  public fullName: string = 'Stoutland SV11W';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Odor Sleuth
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.discard.cards.length === 0) {
        return state;
      }

      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, results => {
        const headsCount = results.filter(r => r).length;

        if (headsCount === 0) {
          return;
        }

        const maxCards = Math.min(player.discard.cards.length, headsCount);
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          {},
          { min: 0, max: maxCards, allowCancel: false }
        ), selected => {
          if (selected && selected.length > 0) {
            MOVE_CARDS(store, state, player.discard, player.hand, { cards: selected, sourceCard: this });
          }
        });
      });
    }

    // Special Fang
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const checkEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkEnergy);

      const hasSpecialEnergy = checkEnergy.energyMap.some(em =>
        em.card.energyType === EnergyType.SPECIAL
      );

      if (hasSpecialEnergy) {
        effect.damage += 100;
      }
    }

    return state;
  }
}
