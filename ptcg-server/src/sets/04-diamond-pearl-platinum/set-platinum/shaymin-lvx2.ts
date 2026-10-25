import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { GameError, GameMessage, GamePhase, MoveEnergyPrompt, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect, KnockOutEffect } from '../../../game/store/effects/game-effects';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckPokemonTypeEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { ADD_MARKER, HAS_MARKER, IS_POKEBODY_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ShayminLVX2 extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom: string = 'Shaymin';
  protected _tags = [CardTag.POKEMON_LV_X];
  public hp: number = 110;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Revenge Seed',
    powerType: PowerType.POKEBODY,
    text: 'If any of your Grass Pokémon were Knocked Out by damage from an opponent\'s attack during his or her last turn, each of Shaymin\'s attacks does 60 more damage to the Active Pokémon (before applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Energy Flare',
    cost: [G, C],
    damage: 50,
    text: 'You may move any number of Energy cards attached to your Pokémon to your other Pokémon in any way you like.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '127';
  public name: string = 'Shaymin';
  public fullName: string = 'Shaymin LV.X PL2';

  public readonly REVENGE_SEED_MARKER = 'REVENGE_SEED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lv.X must be played onto Active
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Revenge Seed — mark Grass KOs from opponent attacks
    if (effect instanceof KnockOutEffect) {
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (effect.player !== owner) {
        return state;
      }

      const opponent = StateUtils.getOpponent(state, owner);
      if (state.phase !== GamePhase.ATTACK || state.players[state.activePlayer] !== opponent) {
        return state;
      }
      if (!effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)) {
        return state;
      }

      let isInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
        if (card === this) {
          isInPlay = true;
        }
      });
      if (!isInPlay || IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }

      const checkType = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkType);
      if (checkType.cardTypes.includes(CardType.GRASS)) {
        ADD_MARKER(this.REVENGE_SEED_MARKER, owner, this);
      }
    }

    // Revenge Seed — +60 to Active on Shaymin's attacks
    if (effect instanceof AttackEffect && effect.source.cards.includes(this)) {
      if (!IS_POKEBODY_BLOCKED(store, state, effect.player, this)
        && HAS_MARKER(this.REVENGE_SEED_MARKER, effect.player, this)
        && effect.target === effect.opponent.active) {
        effect.damage += 60;
      }
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.REVENGE_SEED_MARKER, this);

    // Energy Flare
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { min: 0, allowCancel: true }
      ), transfers => {
        if (transfers === null) {
          return;
        }
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    // Inherit previous stage attacks / powers
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
        if (
          evolutionCard.superType === SuperType.POKEMON &&
          evolutionCard !== this &&
          evolutionCard.name === this.evolvesFrom
        ) {
          effect.attacks.push(...(evolutionCard.attacks || []));
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
        if (
          evolutionCard.superType === SuperType.POKEMON &&
          evolutionCard !== this &&
          evolutionCard.name === this.evolvesFrom
        ) {
          effect.powers.push(...(evolutionCard.powers || []));
        }
      }
    }

    return state;
  }
}
