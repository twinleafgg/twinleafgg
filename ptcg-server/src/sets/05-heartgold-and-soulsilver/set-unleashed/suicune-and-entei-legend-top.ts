import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardTag, CardType } from '../../../game/store/card/card-types';
import {
  Card,
  ChooseEnergyPrompt,
  GameError,
  GameMessage,
  PokemonCardList,
  PowerType,
  State,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  ADD_BURN_TO_PLAYER_ACTIVE,
  AFTER_ATTACK,
  MOVE_CARDS,
  WAS_ATTACK_USED,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { SuicuneAndEnteiLegendBottom } from './suicune-and-entei-legend-bottom';

export class SuicuneAndEnteiLegendTop extends PokemonCard {
  public stage: Stage = Stage.LEGEND;
  protected _tags = [CardTag.LEGEND, CardTag.DUAL_LEGEND];
  public cardType: CardType[] = [R, W];
  public hp: number = 160;
  public weakness = [{ type: W }, { type: L }];
  public retreat = [C];

  public powers = [
    {
      name: 'Legend Assembly',
      text: 'Put this card from your hand onto your Bench only with the other half of Entei & Raikou LEGEND.',
      exemptFromAbilityLock: true,
      useFromHand: true,
      powerType: PowerType.LEGEND_ASSEMBLY,
    },
  ];

  public attacks = [
    {
      name: 'Torrent Blade',
      cost: [W, W, C],
      damage: 0,
      text: "Return 2 [W] Energy attached to Suicune & Entei LEGEND to your hand. Choose 1 of your opponent's Benched Pokémon. This attack does 100 damage to that Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Bursting Inferno',
      cost: [R, C, C],
      damage: 80,
      text: 'The Defending Pokémon is now Burned.',
    },
  ];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';
  public name: string = 'Suicune & Entei LEGEND';
  public fullName: string = 'Suicune & Entei LEGEND (Top) UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // assemblin the avengers
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let topPiece = false;
      let bottomPiece = false;
      let topCard: SuicuneAndEnteiLegendTop | null = null;
      let bottomCard: SuicuneAndEnteiLegendBottom | null = null;

      player.hand.cards.forEach((card) => {
        if (card instanceof SuicuneAndEnteiLegendTop && !topPiece) {
          topPiece = true;
          topCard = card;
        }
        if (card instanceof SuicuneAndEnteiLegendBottom && !bottomPiece) {
          bottomPiece = true;
          bottomCard = card;
        }
      });

      if (topPiece && bottomPiece && topCard && bottomCard) {
        if (slots.length > 0) {
          MOVE_CARDS(store, state, player.hand, slots[0], { cards: [bottomCard], sourceCard: this });
          MOVE_CARDS(store, state, player.hand, slots[0], { cards: [topCard], sourceCard: this });
          slots[0].pokemonPlayedTurn = state.turn;
        }
      } else {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
    }

    // Torrent Blade
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(100, effect, store, state);
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      const energyList: CardType[] = [CardType.WATER, CardType.WATER];

      state = store.prompt(
        state,
        new ChooseEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          checkProvidedEnergy.energyMap,
          energyList,
          { allowCancel: false },
        ),
        (energy) => {
          const cards: Card[] = (energy || []).map((e) => e.card);
          MOVE_CARDS(store, state, player.active, player.hand, {
            cards,
            sourceEffect: this.attacks[0],
          });
        },
      );
    }

    // Bursting Inferno
    if (AFTER_ATTACK(effect, 1, this)) {
      ADD_BURN_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
    }

    return state;
  }
}
