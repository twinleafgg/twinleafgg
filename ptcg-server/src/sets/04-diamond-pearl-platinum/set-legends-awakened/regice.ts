import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt, GameError, GameMessage, PowerType, StateUtils } from '../../../game';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {ABILITY_USED, ADD_MARKER, HAS_MARKER, REMOVE_MARKER, REMOVE_MARKER_AT_END_OF_TURN, REMOVE_MARKER_FROM_ACTIVE_AT_END_OF_TURN, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';

export class Regice extends PokemonCard {

  public stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp = 90;
  public weakness = [{ type: M }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Regi Move',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may use this power. Discard 2 cards from your hand and choose 1 of your opponent\'s Active Pokémon that isn\'t an Evolved Pokémon. Then, your opponent switches that Pokémon with 1 of his or her Benched Pokémon. This power can\'t be used if Regice is affected by a Special Condition.'
  }];

  public attacks = [
    {
      name: 'Ice Reflect',
      cost: [W, W, C],
      damage: 50,
      text: 'If Regice was damaged by an attack during your opponent\'s last turn, the Defending Pokémon is now Paralyzed.'
    }
  ];

  public set: string = 'LA';
  public setNumber: string = '36';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Regice';
  public fullName: string = 'Regice LA';

  public readonly REGI_MOVE_MARKER = 'REGI_MOVE_MARKER';
  public readonly ICE_REFLECT_MARKER = 'ICE_REFLECT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      REMOVE_MARKER(this.REGI_MOVE_MARKER, effect.player, this);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.REGI_MOVE_MARKER, this);
    REMOVE_MARKER_FROM_ACTIVE_AT_END_OF_TURN(effect, this.ICE_REFLECT_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.REGI_MOVE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.hand.cards.length < 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { allowCancel: true, min: 2, max: 2 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        const opponent = StateUtils.getOpponent(state, player);

        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

        ADD_MARKER(this.REGI_MOVE_MARKER, player, this);
        ABILITY_USED(player, this);

        if (opponent.active.getPokemons().length < 2) {
          SWITCH_ACTIVE_WITH_BENCHED(store, state, opponent);
        } else {
          // Rulings state that you can discard cards even if the opponent's active is evolved
          return state;
        }
      });
    }

    // Not sure how to manage the markers on this
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (HAS_MARKER(this.ICE_REFLECT_MARKER, player, this)) {
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
      }
    }

    if (effect instanceof AfterDamageEffect && effect.target.cards.includes(this)) {
      const targetPlayer = StateUtils.findOwner(state, effect.target);
      const player = effect.player;

      if (effect.damage <= 0 || player === targetPlayer || targetPlayer.active !== effect.target) {
        return state;
      }

      ADD_MARKER(this.ICE_REFLECT_MARKER, targetPlayer, this);
      console.log('added ice marker');
    }

    return state;
  }
}