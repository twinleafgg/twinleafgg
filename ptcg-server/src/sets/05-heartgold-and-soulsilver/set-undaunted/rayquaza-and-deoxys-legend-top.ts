import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardTag, CardType } from '../../../game/store/card/card-types';
import {
  GameError,
  GameMessage,
  PokemonCardList,
  PowerType,
  State,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { RayquazaAndDeoxysLegendBottom } from './rayquaza-and-deoxys-legend-bottom';
import {
  IF_OPPONENTS_POKEMON_KO_BY_ATTACK_DAMAGE_TAKE_MORE_PRIZES,
  MOVE_CARDS,
  WAS_ATTACK_USED,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class RayquazaAndDeoxysLegendTop extends PokemonCard {
  public stage: Stage = Stage.LEGEND;
  protected _tags = [CardTag.LEGEND, CardTag.DUAL_LEGEND];
  public cardType: CardType[] = [C, P];
  public hp: number = 140;
  public weakness = [{ type: C }, { type: P }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Legend Assembly',
      text: 'Put this card from your hand onto your Bench only with the other half of Rayquaza & Deoxys LEGEND.',
      exemptFromAbilityLock: true,
      useFromHand: true,
      powerType: PowerType.LEGEND_ASSEMBLY,
    },
    {
      name: 'Space Virus',
      powerType: PowerType.POKEBODY,
      text: "If your opponent's Pokémon is Knocked Out by damage from an attack of Rayquaza & Deoxys LEGEND, take 1 more Prize card.",
    },
  ];

  public attacks = [
    {
      name: 'Ozone Buster',
      cost: [R, R, L, C],
      damage: 150,
      text: 'Discard all [R] Energy attached to Rayquaza & Deoxys LEGEND.',
    },
  ];

  public set: string = 'UD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '89';
  public name: string = 'Rayquaza & Deoxys LEGEND';
  public fullName: string = 'Rayquaza & Deoxys LEGEND (Top) UD';

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
      let topCard: RayquazaAndDeoxysLegendTop | null = null;
      let bottomCard: RayquazaAndDeoxysLegendBottom | null = null;

      player.hand.cards.forEach((card) => {
        if (card instanceof RayquazaAndDeoxysLegendTop && !topPiece) {
          topPiece = true;
          topCard = card;
        }
        if (card instanceof RayquazaAndDeoxysLegendBottom && !bottomPiece) {
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

    // Space Virus
    state = IF_OPPONENTS_POKEMON_KO_BY_ATTACK_DAMAGE_TAKE_MORE_PRIZES(store, state, effect, this, {
      checkPokebodyBlocked: true,
    });

    // Ozone Buster
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergy);

      checkProvidedEnergy.energyMap.forEach((em) => {
        if (em.provides.includes(CardType.FIRE) || em.provides.includes(CardType.ANY)) {
          MOVE_CARDS(store, state, player.active, player.discard, { cards: [em.card] });
        }
      });
    }

    return state;
  }
}
