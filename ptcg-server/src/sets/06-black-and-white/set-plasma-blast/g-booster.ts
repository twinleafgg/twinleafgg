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
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
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

  // Ref: set-paradox-rift/technical-machine-turbo-energize.ts (tool-provided attack execution)
  DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 2);

  return state;
}

export class GBooster extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  protected _tags = [CardTag.ACE_SPEC, CardTag.TEAM_PLASMA];
  public set: string = 'PLB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '92';
  public name: string = 'G Booster';
  public fullName: string = 'G Booster PLB';

  public attacks: Attack[] = [
    {
      name: 'G Booster',
      cost: [G, G, C],
      damage: 200,
      shredAttack: true,
      text: "Discard 2 Energy attached to this Pokémon. This attack's damage isn't affected by any effects on the Defending Pokémon.",
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
