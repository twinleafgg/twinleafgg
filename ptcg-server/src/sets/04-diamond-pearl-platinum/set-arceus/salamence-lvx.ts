import { CardTag, CardType, GameError, GameMessage, PlayerType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { GamePhase } from '../../../game/store/state/state';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { ADD_MARKER, CONFIRMATION_PROMPT, HAS_MARKER, IS_POKEPOWER_BLOCKED, REMOVE_MARKER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class SalamenceLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom: string = 'Salamence';
  protected _tags = [CardTag.POKEMON_LV_X];
  public hp: number = 160;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Double Fall',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), when you put Salamence LV.X from your hand onto your Active Salamence, you may use this power. For each of your opponent\'s Pokémon that is Knocked Out by damage from Salamence\'s attacks this turn, take 1 more Prize card.'
  }];

  public attacks = [{
    name: 'Steam Blast',
    cost: [R, W, C, C],
    damage: 100,
    text: 'Discard an Energy card attached to Salamence.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '98';
  public name: string = 'Salamence';
  public fullName: string = 'Salamence LV.X AR';

  public readonly DOUBLE_FALL_MARKER = 'DOUBLE_FALL_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, wantToUse => {
        if (wantToUse) {
          ADD_MARKER(this.DOUBLE_FALL_MARKER, player, this);
        }
      });
    }

    if (effect instanceof KnockOutEffect && HAS_MARKER(this.DOUBLE_FALL_MARKER, StateUtils.getOpponent(state, effect.player), this)) {
      const attacker = StateUtils.getOpponent(state, effect.player);
      if (state.phase !== GamePhase.ATTACK || state.players[state.activePlayer] !== attacker) {
        return state;
      }
      if (!effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)) {
        return state;
      }
      if (attacker.active.getPokemonCard() !== this) {
        return state;
      }
      if (effect.prizeCount > 0) {
        effect.prizeCount += 1;
      }
    }

    if (effect instanceof EndTurnEffect && HAS_MARKER(this.DOUBLE_FALL_MARKER, effect.player, this)) {
      REMOVE_MARKER(this.DOUBLE_FALL_MARKER, effect.player, this);
    }

    // Steam Blast
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
    }

    if (effect instanceof CheckTableStateEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner !== player) {
        return state;
      }
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          player.showAllStageAbilities = true;
        }
      });
    }

    if (effect instanceof CheckPokemonAttacksEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner !== player) {
        return state;
      }
      let isThisInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
        }
      });
      if (!isThisInPlay) {
        return state;
      }
      for (const evolutionCard of cardList.cards) {
        if (evolutionCard.superType === SuperType.POKEMON && evolutionCard !== this && evolutionCard.name === this.evolvesFrom) {
          effect.attacks.push(...((evolutionCard as PokemonCard).attacks || []));
        }
      }
    }

    if (effect instanceof CheckPokemonPowersEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner !== player) {
        return state;
      }
      let isThisInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
        }
      });
      if (!isThisInPlay) {
        return state;
      }
      for (const evolutionCard of cardList.cards) {
        if (evolutionCard.superType === SuperType.POKEMON && evolutionCard !== this && evolutionCard.name === this.evolvesFrom) {
          effect.powers.push(...((evolutionCard as PokemonCard).powers || []));
        }
      }
    }

    return state;
  }
}
