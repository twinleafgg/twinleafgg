import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ConfirmPrompt, EnergyCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';
export class Flareon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Eevee';
  public cardType: CardType[] = [R];
  public hp: number = 90;
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Sand-Attack',
      cost: [C],
      damage: 20,
      text: 'If the Defending Pokémon tries to attack during your opponent\'s next turn, your opponent flips a coin. If tails, that attack does nothing.'
    },
    {
      name: 'Fire Slash',
      cost: [R, C, C],
      damage: 60,
      damageCalculation: '+',
      text: 'You may discard a [R] Energy attached to this Pokémon. If you do, this attack does 30 more damage.'
    }
  ];

  public set: string = 'DEX';
  public setNumber: string = '12';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Flareon';
  public fullName: string = 'Flareon DEX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK (Smokescreen)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this);
    }

    // Fire Slash - may discard Fire energy for +30
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const hasFireEnergy = player.active.cards.some(c =>
        c.superType === SuperType.ENERGY &&
        (c as EnergyCard).provides?.includes(CardType.FIRE)
      );

      if (hasFireEnergy) {
        return store.prompt(state, new ConfirmPrompt(
          player.id,
          GameMessage.WANT_TO_DEAL_MORE_DAMAGE
        ), result => {
          if (result) {
            const fireEnergy = player.active.cards.find(c =>
              c.superType === SuperType.ENERGY &&
              (c as EnergyCard).provides?.includes(CardType.FIRE)
            );
            if (fireEnergy) {
              MOVE_CARDS(store, state, player.active, player.discard, { cards: [fireEnergy], sourceCard: this });
              effect.damage += 30;
            }
          }
        });
      }
    }

    return state;
  }
}
