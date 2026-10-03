import {
  PokemonCard,
  Stage,
  CardType,
  CardTag,
  State,
  StoreLike,
  PowerType,
  AttachEnergyPrompt,
  GameMessage,
  PlayerType,
  SlotType,
  StateUtils,
  SuperType,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';

import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class BlisseyV extends PokemonCard {
  public stage: Stage = Stage.BASIC;

  protected _tags = [CardTag.POKEMON_V];

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 250;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Natural Cure',
      powerType: PowerType.ABILITY,
      text: 'Whenever you attach an Energy card from your hand to this Pokémon, it recovers from all Special Conditions.',
    },
  ];

  public attacks = [
    {
      name: 'Blissful Blast',
      cost: [CardType.COLORLESS],
      damage: 10,
      damageCalculation: '+',
      text: 'This attack does 30 more damage for each Energy attached to this Pokémon. If you did any damage with this attack, you may attach up to 3 Energy cards from your discard pile to this Pokémon.',
    },
  ];

  public set: string = 'CRE';

  public regulationMark = 'E';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '119';

  public name: string = 'Blissey V';

  public fullName: string = 'Blissey V CRE';

  public usedBlissfulBlast = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // if (effect instanceof AttachEnergyEffect && effect.target.cards.includes(this)) {
    //   const player = effect.player;
    //   const pokemonCard = effect.target.getPokemonCard();

    //   if (pokemonCard !== this) {
    //     return state;
    //   }

    //   // Try to reduce PowerEffect, to check if something is blocking our ability
    //   try {
    //     const stub = new PowerEffect(player, {
    //       name: 'test',
    //       powerType: PowerType.ABILITY,
    //       text: ''
    //     }, this);
    //     store.reduceEffect(state, stub);
    //   } catch {
    //     return state;
    //   }

    //   // Heal conditions
    //   effect.target.specialConditions = [];
    //   return state;
    // }

    if (effect instanceof EndTurnEffect && this.usedBlissfulBlast) {
      this.usedBlissfulBlast = false;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let energies = 0;
      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergyEffect);
      checkProvidedEnergyEffect.energyMap.forEach((energy) => {
        energies += energy.provides.length;
      });

      effect.damage = 10 + 30 * energies;

      //const energies = player.active.cards.filter(card => card instanceof EnergyCard);

      this.usedBlissfulBlast = true;
    }

    if (effect instanceof AfterAttackEffect && this.usedBlissfulBlast === true) {
      const player = effect.player;

      // Only proceed if the active Pokémon is Blissey V
      if (player.active.getPokemonCard() !== this) {
        this.usedBlissfulBlast = false;
        return state;
      }

      const energyCards = player.discard.cards.filter((c) => c.superType === SuperType.ENERGY);
      const maxEnergyCards = Math.min(3, energyCards.length);

      if (energyCards.length === 0) {
        this.usedBlissfulBlast = false;
        return state;
      }

      this.usedBlissfulBlast = false;

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 0, max: maxEnergyCards },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
          return state;
        },
      );
    }
    return state;
  }
}
