import { CardTag, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import {
  CheckProvidedEnergyEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect, EnergyEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { GameError, GameMessage, PlayerType } from '../../../game';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { EnergyMap } from '../../../game/store/prompts/choose-energy-prompt';
import { CardList } from '../../../game/store/state/card-list';
import { Card } from '../../../game/store/card/card';
import {IS_SPECIAL_ENERGY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

export class AquaEnergy extends EnergyCard {
  public provides: CardType[] = [CardType.COLORLESS];
  public energyType = EnergyType.SPECIAL;
  public set: string = 'MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '86';
  public name = 'Aqua Energy';
  public fullName = 'Aqua Energy MA';

  public text =
    "Aqua Energy can be attached only to a Pokémon with Team Aqua in its name. Aqua Energy provides [W] and [D] Energy but provides 2 Energy at a time. (Doesn't count as a basic Energy card when not in play and has no other effect than providing Energy.) At the end of your turn, discard Aqua Energy.";

  private getExistingEnergy(source: CardList): EnergyMap[] {
    return source.cards
      .filter((card: Card) => card.superType === SuperType.ENERGY && card !== this)
      .map((card: Card) => ({
        card: card as EnergyCard,
        provides: (card as EnergyCard).provides,
      }));
  }

  private countEnergyType(energy: EnergyMap[], type: CardType): number {
    return energy.reduce((count, e) => {
      return count + e.provides.filter((p) => p === type).length;
    }, 0);
  }

  private getEnergyToProvide(attackCost: CardType[], existingEnergy: EnergyMap[]): CardType[] {
    const needsWater = attackCost.includes(CardType.WATER);
    const needsDark = attackCost.includes(CardType.DARK);

    if (!needsWater && !needsDark) {
      return [CardType.COLORLESS, CardType.COLORLESS];
    }

    const waterCount = this.countEnergyType(existingEnergy, CardType.WATER);
    const darkCount = this.countEnergyType(existingEnergy, CardType.DARK);
    const requiredWater = attackCost.filter((c) => c === CardType.WATER).length;
    const requiredDark = attackCost.filter((c) => c === CardType.DARK).length;

    const hasEnoughWater = !needsWater || waterCount >= requiredWater;
    const hasEnoughDark = !needsDark || darkCount >= requiredDark;

    if (hasEnoughWater && hasEnoughDark) {
      return [CardType.COLORLESS, CardType.COLORLESS];
    }

    if (needsWater && needsDark) {
      if (!hasEnoughWater && !hasEnoughDark) {
        return [CardType.WATER, CardType.DARK];
      }
      if (!hasEnoughWater) {
        return [CardType.WATER, CardType.WATER];
      }
      return [CardType.DARK, CardType.DARK];
    }

    if (needsWater && !hasEnoughWater) {
      return [CardType.WATER, CardType.WATER];
    }

    if (needsDark && !hasEnoughDark) {
      return [CardType.DARK, CardType.DARK];
    }

    return [CardType.COLORLESS, CardType.COLORLESS];
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Prevent attaching to non Team Rocket's Pokemon
    if (effect instanceof AttachEnergyEffect) {
      if (
        effect.energyCard === this &&
        !effect.target.getPokemonCard()?.hasTag(CardTag.TEAM_AQUA)
      ) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Discard card when not attached to Team Rocket's Pokemon
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (
            !cardList.cards.includes(this) ||
            IS_SPECIAL_ENERGY_BLOCKED(store, state, player, this, cardList)
          ) {
            return;
          }

          const pokemonCard = cardList.getPokemonCard();
          if (pokemonCard && !pokemonCard.hasTag(CardTag.TEAM_AQUA)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }

    // Discard card at the end of the turn
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList.cards.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
    }

    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      try {
        const energyEffect = new EnergyEffect(effect.player, this);
        store.reduceEffect(state, energyEffect);
      } catch {
        return state;
      }

      const pokemonCard = effect.source.getPokemonCard();
      if (!pokemonCard || !(pokemonCard instanceof PokemonCard)) {
        return state;
      }

      const attackCost = pokemonCard.attacks[0]?.cost || [];
      const existingEnergy = this.getExistingEnergy(effect.source);
      const energyToProvide = this.getEnergyToProvide(attackCost, existingEnergy);

      effect.energyMap.push({
        card: this,
        provides: energyToProvide,
      });
    }
    return state;
  }
}
