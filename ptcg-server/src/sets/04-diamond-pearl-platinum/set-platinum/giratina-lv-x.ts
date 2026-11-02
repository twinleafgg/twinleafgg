import { ChooseCardsPrompt, GameError, GameMessage, PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect, KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_POKEBODY_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class GiratinaLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom = 'Giratina';
  protected _tags = [CardTag.POKEMON_LV_X];
  public hp: number = 130;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Invisible Tentacles',
    powerType: PowerType.POKEBODY,
    text: 'Whenever your opponent\'s Pokémon tries to attack, your opponent discards 1 card from his or her hand. (If your opponent can\'t discard 1 card, your opponent\'s Pokémon can\'t attack.) You can\'t use more than 1 Invisible Tentacles Poké-Body each turn.'
  }];

  public attacks = [{
    name: 'Darkness Lost',
    cost: [P, P, C, C],
    damage: 0,
    text: 'This attack does 30 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.) If any of your opponent\'s Pokémon would be Knocked Out by damage from this attack, put that Pokémon and all cards attached to it in the Lost Zone instead of discarding it.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '124';
  public name: string = 'Giratina';
  public fullName: string = 'Giratina LV.X PL';

  public readonly DARKNESS_LOST_MARKER = 'DARKNESS_LOST_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Invisible Tentacles
    if (effect instanceof AttackEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (player === owner) {
        return state;
      }
      let isGiratinaInPlay = false;
      opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, card => {
        if (card.getPokemonCard() === this) {
          isGiratinaInPlay = true;
        }
      });
      if (!isGiratinaInPlay) {
        return state;
      }

      if (effect.invisibleTentacles) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, opponent, this)) {
        return state;
      }

      if (player.hand.cards.length === 0) {
        throw new GameError(GameMessage.BLOCKED_BY_ABILITY);
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        if (selected) {
          effect.invisibleTentacles = true;
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: selected });
        }
      });
    }

    // Darkness Lost
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;

      opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList === opponent.active) {
          const damage = new DealDamageEffect(effect, 30);
          damage.target = cardList;
          store.reduceEffect(state, damage);
        } else {
          const damage = new PutDamageEffect(effect, 30);
          damage.target = cardList;
          store.reduceEffect(state, damage);
        }
        cardList.marker.addMarker(this.DARKNESS_LOST_MARKER, this);
      });
    }

    if (effect instanceof KnockOutEffect && effect.target.marker.hasMarker(this.DARKNESS_LOST_MARKER, this) && effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)) {
      // just using the already existing code for lost city because i can't be bothered to do an engine change
      effect.target.marker.addMarker('LOST_CITY_MARKER', this);
    }

    // removing the marker
    if (effect instanceof EndTurnEffect) {
      effect.player.forEachPokemon(PlayerType.ANY, card => {
        if (card.marker.hasMarker(this.DARKNESS_LOST_MARKER, this)) {
          card.marker.removeMarker(this.DARKNESS_LOST_MARKER, this);
        }
      });
    }

    // making sure it gets put on the active pokemon
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Trying to get all of the previous stage's attacks and powers
    if (effect instanceof CheckTableStateEffect) {
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
          player.showAllStageAbilities = true;
        }
      });

      if (!isThisInPlay) {
        return state;
      }
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
