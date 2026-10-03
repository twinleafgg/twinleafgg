import { Attack, Card, GameError, GameMessage } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
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
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

function* useAttack(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;

  if (player.active.getPokemonCard()?.name !== 'Mega Zygarde ex') {
    throw new GameError(GameMessage.CANNOT_USE_ATTACK);
  }

  const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
  state = store.reduceEffect(state, checkProvidedEnergy);

  const cards: Card[] = checkProvidedEnergy.energyMap.map((e) => e.card);
  const discardEnergy = new DiscardCardsEffect(effect, cards);
  discardEnergy.target = player.active;
  store.reduceEffect(state, discardEnergy);

  return state;
}

export class CoreMemory extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '70';
  public name: string = 'Core Memory';
  public fullName: string = 'Core Memory M3';

  public attacks: Attack[] = [
    {
      name: 'Geobuster',
      cost: [F, F, F, F],
      damage: 350,
      text: 'Discard all Energy attached to this Pokémon.',
    },
  ];

  public text: string =
    'The Mega Zygarde ex this card is attached to can use the attack on this card. (You still need the necessary Energy to use this attack.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && effect.attack === this.attacks[0]) {
      const pokemonCard = effect.player.active.getPokemonCard();

      if (pokemonCard?.name !== 'Mega Zygarde ex') {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }
      if (pokemonCard && 'getColorlessReduction' in pokemonCard) {
        const colorlessReudction = (pokemonCard as ColorlessCostReducer).getColorlessReduction(
          state,
        );
        for (let i = 0; i < colorlessReudction && effect.cost.includes(CardType.COLORLESS); i++) {
          const index = effect.cost.indexOf(CardType.COLORLESS);
          if (index !== -1) {
            effect.cost.splice(index, 1);
          }
        }
      }
      /*if (pokemonCard && 'getDarkReduction' in pokemonCard) {
        const darkReduction = (pokemonCard as DarkCostReducer).getDarkReduction(state);
        for (let i = 0; i < darkReduction && effect.cost.includes(CardType.DARK); i++) {
          const index = effect.cost.indexOf(CardType.DARK);
          if (index !== -1) {
            effect.cost.splice(index, 1);
          }
        }
      }
      if (pokemonCard && 'getWaterReduction' in pokemonCard) {
        const waterReduction = (pokemonCard as WaterCostReducer).getWaterReduction(state);
        for (let i = 0; i < waterReduction && effect.cost.includes(CardType.WATER); i++) {
          const index = effect.cost.indexOf(CardType.WATER);
          if (index !== -1) {
            effect.cost.splice(index, 1);
          }
        }
      }*/
    }
    if (
      effect instanceof CheckPokemonAttacksEffect &&
      effect.player.active.getPokemonCard()?.tools.includes(this) &&
      !effect.attacks.includes(this.attacks[0])
    ) {
      effect.attacks.push(this.attacks[0]);
    }

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      const generator = useAttack(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
