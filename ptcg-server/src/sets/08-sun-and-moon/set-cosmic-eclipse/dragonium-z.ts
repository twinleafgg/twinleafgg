import { Attack, Card, GameError, GameMessage } from '../../../game';
import { CardType, EnergyType, TrainerType } from '../../../game/store/card/card-types';
import { ColorlessCostReducer } from '../../../game/store/card/pokemon-interface';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import {
  CheckAttackCostEffect,
  CheckPokemonAttacksEffect,
  CheckProvidedEnergyEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';

import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class DragoniumZDragonClaw extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'CEC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '190';
  public name: string = 'Dragonium Z: Dragon Claw';
  public fullName: string = 'Dragonium Z: Dragon Claw CEC';

  public attacks: Attack[] = [
    {
      name: 'Destructive Drake',
      cost: [C, C, C],
      damage: 80,
      damageCalculation: 'x',
      text: "Discard all basic Energy from this Pokémon. This attack does 80 damage for each card you discarded in this way. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public text: string =
    'If the Pokémon this card is attached to has the Dragon Claw attack, it can use the GX attack on this card. (You still need the necessary Energy to use this attack.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && effect.attack === this.attacks[0]) {
      const pokemonCard = effect.player.active.getPokemonCard();
      if (pokemonCard && 'getColorlessReduction' in pokemonCard) {
        const reduction = (pokemonCard as ColorlessCostReducer).getColorlessReduction(state);
        for (let i = 0; i < reduction && effect.cost.includes(CardType.COLORLESS); i++) {
          const index = effect.cost.indexOf(CardType.COLORLESS);
          if (index !== -1) {
            effect.cost.splice(index, 1);
          }
        }
      }
    }

    if (
      effect instanceof CheckPokemonAttacksEffect &&
      effect.player.active.getPokemonCard()?.tools.includes(this) &&
      !effect.attacks.includes(this.attacks[0])
    ) {
      effect.attacks.includes(this.attacks[0]);
    }

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      if (player.usedGX) {
        throw new GameError(GameMessage.LABEL_GX_USED);
      }

      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergyEffect);

      let energyCount = 0;
      const cardsToDiscard: Card[] = [];

      checkProvidedEnergyEffect.energyMap.forEach((em) => {
        if (em.card.energyType === EnergyType.BASIC) {
          energyCount += em.provides.length;
          cardsToDiscard.push(em.card);
        }
      });

      effect.damage = energyCount * 80;

      const discardEnergyEffect = new DiscardCardsEffect(effect, cardsToDiscard);
      discardEnergyEffect.target = player.active;
      store.reduceEffect(state, discardEnergyEffect);

      return state;
    }
    return state;
  }
}
