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

export class MagmaEnergy extends EnergyCard {
  public provides: CardType[] = [CardType.COLORLESS];
  public energyType = EnergyType.SPECIAL;
  public set: string = 'MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '87';
  public name = 'Magma Energy';
  public fullName = 'Magma Energy MA';

  public text =
    "Magma Energy can be attached only to a Pokémon with Team Magma in its name. Magma Energy provides [F] and/or [D] Energy but provides 2 Energy at a time. (Doesn't count as a basic Energy card when not in play and has no effect other than providing Energy.) At the end of your turn, discard Magma Energy.";

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
    const needsFighting = attackCost.includes(CardType.FIGHTING);
    const needsDark = attackCost.includes(CardType.DARK);

    if (!needsFighting && !needsDark) {
      return [CardType.COLORLESS, CardType.COLORLESS];
    }

    const fightingCount = this.countEnergyType(existingEnergy, CardType.FIGHTING);
    const darkCount = this.countEnergyType(existingEnergy, CardType.DARK);
    const requiredFighting = attackCost.filter((c) => c === CardType.FIGHTING).length;
    const requiredDark = attackCost.filter((c) => c === CardType.DARK).length;

    const hasEnoughFighting = !needsFighting || fightingCount >= requiredFighting;
    const hasEnoughDark = !needsDark || darkCount >= requiredDark;

    if (hasEnoughFighting && hasEnoughDark) {
      return [CardType.COLORLESS, CardType.COLORLESS];
    }

    if (needsFighting && needsDark) {
      if (!hasEnoughFighting && !hasEnoughDark) {
        return [CardType.FIGHTING, CardType.DARK];
      }
      if (!hasEnoughFighting) {
        return [CardType.FIGHTING, CardType.FIGHTING];
      }
      return [CardType.DARK, CardType.DARK];
    }

    if (needsFighting && !hasEnoughFighting) {
      return [CardType.FIGHTING, CardType.FIGHTING];
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
        !effect.target.getPokemonCard()?.hasTag(CardTag.TEAM_MAGMA)
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
          if (pokemonCard && !pokemonCard.hasTag(CardTag.TEAM_MAGMA)) {
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
