import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  ChooseCardsPrompt,
  PowerType,
  GamePhase,
  StateUtils,
  GameError,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Blastoiseex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Wartortle';
  public cardType: CardType[] = [W];
  public hp: number = 330;
  public weakness = [{ type: L }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Solid Shell',
      powerType: PowerType.ABILITY,
      text: 'This Pokémon takes 30 less damage from attacks (after applying Weakness and Resistance).',
    },
  ];

  public attacks = [
    {
      name: 'Twin Cannons',
      cost: [W, W],
      damage: 140,
      damageCalculation: 'x',
      text: 'Discard up to 2 Basic [W] Energies from your hand. This attack does 140 damage for each card you discarded in this way.',
    },
  ];

  public regulationMark = 'G';
  public set: string = 'MEW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Blastoise ex';
  public fullName: string = 'Blastoise ex MEW';

  // Implement power
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergyInHand = player.hand.cards.some((c) => {
        return c.superType === SuperType.ENERGY;
      });
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.ENERGY },
          { allowCancel: true, min: 1, max: 2 },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }
          const damage = cards.length * 140;
          effect.damage = damage;

          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

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
