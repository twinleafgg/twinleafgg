import { PowerType, State, StateUtils, StoreLike, TrainerCard } from '../../../game';
import { CardType, Stage, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckAttackCostEffect, CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class CastformSunnyForm extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public regulationMark = 'E';

  public cardType: CardType[] = [CardType.FIRE];

  public hp = 70;

  public weakness = [{ type: CardType.WATER }];

  public resistance = [];

  public retreat = [];

  public powers = [
    {
      name: 'Weather Reading',
      text: 'If you have 8 or more Stadium cards in your discard pile, ignore all Energy in this Pokémon\'s attack costs.',
      powerType: PowerType.ABILITY,
      useWhenInPlay: false,
    }
  ];

  public attacks = [
    {
      name: 'High-Pressure Blast',
      cost: [CardType.FIRE, CardType.FIRE, CardType.COLORLESS],
      damage: 150,
      text: 'Discard a Stadium in play. If you can\'t, this attack does nothing.'
    }
  ];

  public set: string = 'CRE';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '22';

  public name: string = 'Castform Sunny Form';

  public fullName: string = 'Castform Sunny Form CRE';

  public getColorlessReduction(state: State): number {
    const player = state.players[state.activePlayer];
    const stadiumsInDiscard = player.discard.cards.filter(c => c instanceof TrainerCard && (<TrainerCard>c).trainerType === TrainerType.STADIUM).length;
    return stadiumsInDiscard >= 8 ? 2 : 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof CheckAttackCostEffect) {
      const player = effect.player;
      const stadiumsInDiscard = player.discard.cards.filter(c => c instanceof TrainerCard && (<TrainerCard>c).trainerType === TrainerType.STADIUM).length;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (stadiumsInDiscard >= 8) {

        const costToRemove = 3;

        for (let i = 0; i < costToRemove; i++) {
          let index = effect.cost.indexOf(CardType.COLORLESS);
          if (index !== -1) {
            effect.cost.splice(index, 1);
          } else {
            index = effect.cost.indexOf(CardType.FIRE);
            if (index !== -1) {
              effect.cost.splice(index, 1);
            }
          }
        }
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {

      const player = effect.player;
      // Check attack cost
      const checkCost = new CheckAttackCostEffect(player, this.attacks[0]);
      state = store.reduceEffect(state, checkCost);

      // Check attached energy
      const checkEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkEnergy);

      const stadiumCard = StateUtils.getStadiumCard(state);

      if (stadiumCard !== undefined) {
        const cardList = StateUtils.findCardList(state, stadiumCard);
        const player = StateUtils.findOwner(state, cardList);
        MOVE_CARDS(store, state, cardList, player.discard, { sourceCard: this });
        return state;
      } else {
        effect.damage = 0;
      }

    }
    return state;
  }
}