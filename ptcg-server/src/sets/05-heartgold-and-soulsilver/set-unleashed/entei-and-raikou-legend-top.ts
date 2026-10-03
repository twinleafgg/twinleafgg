import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardTag, CardType } from '../../../game/store/card/card-types';
import {
  GameError,
  GameMessage,
  PlayerType,
  PokemonCardList,
  PowerType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { EnteiAndRaikouLegendBottom } from './entei-and-raikou-legend-bottom';
import {DISCARD_ALL_ENERGY_FROM_POKEMON,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { CheckPokemonPowersEffect } from '../../../game/store/effects/check-effects';

export class EnteiAndRaikouLegendTop extends PokemonCard {
  public stage: Stage = Stage.LEGEND;
  protected _tags = [CardTag.LEGEND, CardTag.DUAL_LEGEND];
  public cardType: CardType[] = [R, L];
  public hp: number = 140;
  public weakness = [{ type: W }, { type: F }];
  public retreat = [];

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
      name: 'Detonation Spin',
      cost: [R, C],
      damage: 90,
      text: 'Discard a [R] Energy attached to Entei & Raikou LEGEND.',
    },
    {
      name: 'Thunder Fall',
      cost: [L, C],
      damage: 0,
      text: "Discard all Energy attached to Entei & Raikou LEGEND. This attack does 80 damage to each Pokémon that has any Poké-Powers (both yours and your opponent's). This attack's damage isn't affected by Weakness or Resistance.",
    },
  ];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '90';
  public name: string = 'Entei & Raikou LEGEND';
  public fullName: string = 'Entei & Raikou LEGEND (Top) UL';

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
      let topCard: EnteiAndRaikouLegendTop | null = null;
      let bottomCard: EnteiAndRaikouLegendBottom | null = null;

      player.hand.cards.forEach((card) => {
        if (card instanceof EnteiAndRaikouLegendTop && !topPiece) {
          topPiece = true;
          topCard = card;
        }
        if (card instanceof EnteiAndRaikouLegendBottom && !bottomPiece) {
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

    // Detonation Spin
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1, CardType.FIRE);
    }

    // Thunder Fall
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, this);

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        // Check if the Pokemon has an Ability
        const powersEffect = new CheckPokemonPowersEffect(player, card);
        state = store.reduceEffect(state, powersEffect);
        if (
          powersEffect.powers.some(
            (power) =>
              power.powerType === PowerType.POKEPOWER ||
              power.powerType === PowerType.POKEMON_POWER,
          )
        ) {
          // Put 6 damage counters on the Pokemon
          const damageEffect = new PutDamageEffect(effect, 80);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        }
      });

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card) => {
        // Check if the Pokemon has an Ability
        const powersEffect = new CheckPokemonPowersEffect(opponent, card);
        state = store.reduceEffect(state, powersEffect);
        if (
          powersEffect.powers.some(
            (power) =>
              power.powerType === PowerType.POKEPOWER ||
              power.powerType === PowerType.POKEMON_POWER,
          )
        ) {
          // Put 6 damage counters on the Pokemon
          const damageEffect = new PutDamageEffect(effect, 80);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
