import { Attack, GameError, GameMessage } from '../../../game';
import { CardTag, CardType, TrainerType } from '../../../game/store/card/card-types';
import { ColorlessCostReducer } from '../../../game/store/card/pokemon-interface';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  CheckAttackCostEffect,
  CheckPokemonAttacksEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;

  if (player.active.getPokemonCard()?.name !== 'Genesect-EX') {
    throw new GameError(GameMessage.CANNOT_USE_ATTACK);
  }
  // Ref: set-plasma-blast/escavalier.ts (bench-only targeting)
  return THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(
    100,
    effect,
    store,
    state,
  );
}

export class GScope extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  protected _tags = [CardTag.ACE_SPEC, CardTag.TEAM_PLASMA];
  public set: string = 'PLB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';
  public name: string = 'G Scope';
  public fullName: string = 'G Scope PLB';

  public attacks: Attack[] = [
    {
      name: 'G Scope',
      cost: [G, G, C],
      damage: 0,
      text: "This attack does 100 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public text: string =
    'The Genesect-EX this card is attached to can also use the attack on this card. (You still need the necessary Energy to use this attack.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && effect.attack === this.attacks[0]) {
      const pokemonCard = effect.player.active.getPokemonCard();

      if (pokemonCard?.name !== 'Genesect-EX') {
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
      effect.player.active.getPokemonCard()?.name === 'Genesect-EX' &&
      effect.player.active.getPokemonCard()?.tools.includes(this) &&
      !effect.attacks.includes(this.attacks[0])
    ) {
      effect.attacks.push(this.attacks[0]);
    }

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
