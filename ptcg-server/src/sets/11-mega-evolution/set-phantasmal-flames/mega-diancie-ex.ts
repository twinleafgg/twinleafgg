import {
  CardTag,
  CardType,
  DiscardEnergyPrompt,
  GameMessage,
  GamePhase,
  PokemonCard,
  PowerType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  PlayerType,
  SlotType,
  SuperType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
export class MegaDiancieex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [P];
  public hp: number = 270;
  public weakness = [{ type: M }];
  public retreat = [C];

  public powers = [
    {
      name: 'Diamond Coat',
      powerType: PowerType.ABILITY,
      text: 'This Pokémon takes 30 less damage from attacks (after applying Weakness and Resistance).',
    },
  ];

  public attacks = [
    {
      name: 'Garland Ray',
      cost: [P, P],
      damage: 120,
      damageCalculation: 'x',
      text: 'Discard up to 2 Energy cards from this Pokémon, and this attack does 120 damage for each card you discarded in this way.',
    },
  ];

  public regulationMark: string = 'I';
  public set: string = 'PFL';
  public setNumber: string = '41';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Diancie ex';
  public fullName: string = 'Mega Diancie ex M2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      state = store.prompt(
        state,
        new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { min: 1, max: 2, allowCancel: false },
        ),
        (transfers) => {
          if (transfers === null) {
            effect.damage = 0;
            return state;
          }

          const cardsDiscarded = transfers.length;
          effect.damage = 120 * cardsDiscarded;

          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = player.discard;
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }

          return state;
        },
      );
    }

    // Reduce damage by 30
    if (effect instanceof PutDamageEffect && effect.target.cards.includes(this)) {
      const pokemonCard = effect.target.getPokemonCard();

      // It's not this pokemon card
      if (pokemonCard !== this) {
        return state;
      }

      // It's not an attack
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      const player = StateUtils.findOwner(state, effect.target);

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }
      effect.damage = Math.max(0, effect.damage - 30);
    }

    return state;
  }
}
