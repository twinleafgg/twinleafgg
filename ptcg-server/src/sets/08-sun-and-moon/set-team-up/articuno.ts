import { AttachEnergyPrompt, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike, pokemonHasCardType } from '../../../game';
import { CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';

import {BLOCK_TRAINER_TARGET, IS_ABILITY_BLOCKED, IS_TRAINER_TARGET, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Articuno extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [W];

  public hp: number = 110;

  public weakness = [{ type: L }];

  public resistance = [{ type: F, value: -20 }];

  public retreat = [C, C];

  public powers = [{
    name: 'Blizzard Veil',
    powerType: PowerType.ABILITY,
    text: 'As long as this Pokémon is your Active Pokémon, whenever your opponent plays a Supporter card from their hand, prevent all effects of that card done to your Benched [W] Pokémon.'
  }];

  public attacks = [{
    name: 'Cold Cyclone',
    cost: [W, W],
    damage: 70,
    text: 'Move 2 [W] Energy from this Pokémon to 1 of your Benched Pokémon.'
  }];

  public set: string = 'TEU';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '32';

  public name: string = 'Articuno';

  public fullName: string = 'Articuno TEU';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasBench = player.bench.some(b => b.cards.length > 0);

      if (hasBench === false) {
        return state;
      }

      // Count valid [W] Energy attached to Articuno
      const validTypes = [CardType.WATER, CardType.ANY];
      const attachedEnergies = player.active.cards.filter(card => {
        // Only consider EnergyCard instances
        if (card.superType !== SuperType.ENERGY) return false;
        // Check if card is an EnergyCard and provides a valid type
        const energyCard = card as any;
        return Array.isArray(energyCard.provides) && energyCard.provides.some((t: CardType) => validTypes.includes(t));
      });
      const numToMove = Math.min(2, attachedEnergies.length);
      if (numToMove === 0) {
        return state;
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.active,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: numToMove, max: numToMove, validCardTypes: validTypes }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    if (IS_TRAINER_TARGET(effect, { trainerType: TrainerType.SUPPORTER })) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (!opponent.active.cards.includes(this) || IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const pokemonCard = effect.target.getPokemonCard && effect.target.getPokemonCard();
      if (pokemonCard) {
        const isWater = pokemonHasCardType(pokemonCard, CardType.WATER);
        if (isWater && opponent.bench.some(b => b === effect.target)) {
          BLOCK_TRAINER_TARGET(effect);
        }
      }
    }
    return state;
  }
}