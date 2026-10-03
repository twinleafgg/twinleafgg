/* eslint-disable indent */
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import {
  Card,
  ChooseCardsPrompt,
  EnergyCard,
  GameMessage,
  Player,
  PowerType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { CardTag } from '../../../game/store/card/card-types';
import {
  CheckAttackCostEffect,
  CheckProvidedEnergyEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GalarianZapdosV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V];

  public regulationMark = 'E';

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.FIGHTING];

  public hp: number = 210;

  public weakness = [{ type: CardType.PSYCHIC }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Fighting Instinct',
      powerType: PowerType.ABILITY,
      text: "This Pokémon's attacks cost [C] less for each of your opponent's Pokémon V in play.",
    },
  ];

  public attacks = [
    {
      name: 'Thunderous Kick',
      cost: [CardType.FIGHTING, CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 170,
      text: "Before doing damage, discard a Special Energy from your opponent's Active Pokémon.",
    },
  ];

  public set: string = 'CRE';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '80';

  public name: string = 'Galarian Zapdos V';

  public fullName: string = 'Galarian Zapdos V CRE';

  // Implement ability
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof CheckAttackCostEffect &&
      (effect.attack === this.attacks[0] ||
        this.tools.some((tool) => tool.attacks && tool.attacks.includes(effect.attack)))
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Count V, VSTAR, and VMAX Pokémon in play for the opponent
      const countSpecialPokemon = (player: Player): number => {
        const specialTags = [CardTag.POKEMON_V, CardTag.POKEMON_VSTAR, CardTag.POKEMON_VMAX];
        let count = 0;

        // Check active Pokémon
        const activePokemon = player.active.getPokemonCard();
        if (activePokemon && specialTags.some((tag) => activePokemon.hasTag(tag))) {
          count++;
        }

        // Check bench Pokémon
        player.bench.forEach((slot) => {
          const benchPokemon = slot.getPokemonCard();
          if (benchPokemon && specialTags.some((tag) => benchPokemon.hasTag(tag))) {
            count++;
          }
        });

        return count;
      };

      try {
        const stub = new PowerEffect(
          player,
          {
            name: 'test',
            powerType: PowerType.ABILITY,
            text: '',
          },
          this,
        );
        store.reduceEffect(state, stub);
      } catch {
        console.log(effect.cost);
        return state;
      }

      const specialPokemonCount = countSpecialPokemon(opponent);

      // Determine Colorless energy reduction based on special Pokémon count
      const colorlessToRemove = Math.min(specialPokemonCount, 4);

      // Remove Colorless energy from attack cost
      for (let i = 0; i < colorlessToRemove; i++) {
        const index = effect.cost.indexOf(CardType.COLORLESS);
        if (index !== -1) {
          effect.cost.splice(index, 1);
        }
      }

      console.log(effect.cost);

      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const oppActive = opponent.active;

      const checkEnergy = new CheckProvidedEnergyEffect(player, oppActive);
      store.reduceEffect(state, checkEnergy);

      checkEnergy.energyMap.forEach((em) => {
        const energyCard = em.card;
        if (energyCard instanceof EnergyCard && energyCard.energyType === EnergyType.SPECIAL) {
          let cards: Card[] = [];
          store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_DISCARD,
              oppActive,
              { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
              { min: 1, max: 1, allowCancel: false },
            ),
            (selected) => {
              cards = selected;
            },
          );
          MOVE_CARDS(store, state, oppActive, opponent.discard, { cards: cards, sourceCard: this });

          const damageEffect = new PutDamageEffect(effect, 20);
          damageEffect.target = opponent.active;
          store.reduceEffect(state, damageEffect);
        }
      });
    }
    return state;
  }
}
