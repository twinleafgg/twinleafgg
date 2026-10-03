import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, Card, CardTarget, EnergyCard, GameMessage, GamePhase, PlayerType, PokemonCardList, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {IS_ABILITY_BLOCKED, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';

export class Raichu extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Pikachu';
  public hp: number = 120;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Electrical Grounding',
    powerType: PowerType.ABILITY,
    text: 'When 1 of your Pokémon is Knocked Out by damage from an attack from your opponent\'s Pokémon, you may move a Lightning Energy from that Pokémon to this Pokémon.',
  }];

  public attacks = [{
    name: 'Thunder',
    cost: [L, L, C],
    damage: 180,
    text: 'This Pokémon also does 50 damage to itself.'
  }];

  public regulationMark = 'G';
  public set: string = 'MEW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '26';
  public name: string = 'Raichu';
  public fullName: string = 'Raichu MEW';

  public readonly ELECTRICAL_GROUNDING_MARKER: string = 'ELECTRICAL_GROUNDING_MARKER';

  private isEligibleBasicLightningEnergy(card: Card): card is EnergyCard {
    return (
      card instanceof EnergyCard &&
      card.energyType === EnergyType.BASIC &&
      card.provides.some(
        (p) => p === CardType.LIGHTNING || p === CardType.ANY,
      )
    );
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Electrical Grounding
    if (effect instanceof KnockOutEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Do not activate between turns, or when it's not opponents turn.
      if (state.phase !== GamePhase.ATTACK || state.players[state.activePlayer] !== opponent) {
        return state;
      }

      // This Pokémon must still be in play
      const thisCardList = StateUtils.findCardList(state, this);
      if (!(thisCardList instanceof PokemonCardList)) {
        return state;
      }

      // Can't attach to itself if it was KO'd
      if (thisCardList === effect.target) {
        return state;
      }

      // The KO'd Pokémon must belong to the same player as this Raichu
      const targetOwner = StateUtils.findOwner(state, effect.target);
      const thisOwner = StateUtils.findOwner(state, thisCardList);
      if (targetOwner !== thisOwner) {
        return state;
      }

      // Must be damage from an opponent's attack
      if (!player.marker.hasMarker(player.DAMAGE_DEALT_MARKER)) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      // Find eligible Lightning Energy on the KO'd Pokémon
      const blocked = effect.target.cards
        .map((c, idx) => this.isEligibleBasicLightningEnergy(c) ? -1 : idx)
        .filter(idx => idx >= 0);

      // If there's no eligible Lightning Energy to move, don't show the prompt
      if (blocked.length === effect.target.cards.length) {
        return state;
      }

      // Add marker, do not invoke this effect for other exp. share
      effect.target.marker.addMarker(this.ELECTRICAL_GROUNDING_MARKER, this);

      const targetCopy = new PokemonCardList();
      targetCopy.cards = effect.target.cards.slice();

      // Build blockedTo to only allow attaching to this Raichu
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList !== thisCardList) {
          blockedTo.push(target);
        }
      });

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          targetCopy,
          PlayerType.BOTTOM_PLAYER,
          thisCardList === player.active ? [SlotType.ACTIVE] : [SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { blocked, blockedTo, validCardTypes: [CardType.LIGHTNING, CardType.ANY], allowCancel: false, min: 0, max: 1 }
        ),
        transfers => {
          transfers = transfers || [];
          effect.target.marker.removeMarker(this.ELECTRICAL_GROUNDING_MARKER);
          for (const transfer of transfers) {
            MOVE_CARDS(store, state, player.discard, thisCardList, { cards: [transfer.card], sourceCard: this });
          }
        }
      );
    }

    // Thunder
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 50);
    }

    return state;
  }
}
