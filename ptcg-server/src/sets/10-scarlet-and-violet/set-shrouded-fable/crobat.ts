import { BoardEffect, CardType, GameError, GameMessage, PlayerType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect, TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {ADD_MARKER, ADD_POISON_TO_PLAYER_ACTIVE, HAS_MARKER, REMOVE_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Crobat extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Golbat';
  public cardType: CardType[] = [D];
  public hp: number = 130;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [];

  public powers = [
    {
      name: 'Shadowy Envoy',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      text: 'Once during your turn, if you played Janine\'s Secret Art from your hand this turn, you may draw cards until you have 8 cards in your hand.'
    }
  ];

  public attacks = [
    {
      name: 'Poison Fang',
      cost: [D, C],
      damage: 120,
      text: 'Your opponent\'s Active Pokémon is now Poisoned. During Pokémon Checkup, put 2 damage counters on that Pokémon instead of 1.'
    }
  ];

  public regulationMark: string = 'H';
  public set: string = 'SFA';
  public setNumber: string = '29';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Crobat';
  public fullName: string = 'Crobat SFA';

  public readonly SHADOWY_ENVOY_MARKER = 'SHADOWY_ENVOY_MARKER';
  public readonly PLAY_JANINES_SECRET_ART_MARKER = 'PLAY_JANINES_SECRET_ART_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof TrainerEffect && effect.trainerCard.name == 'Janine\'s Secret Art') {
      ADD_MARKER(this.PLAY_JANINES_SECRET_ART_MARKER, effect.player, this);
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      REMOVE_MARKER(this.SHADOWY_ENVOY_MARKER, effect.player, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      //Check if the player's hand has fewer than 8 cards, and if they have not already used the ability.
      if (player.hand.cards.length >= 8) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (HAS_MARKER(this.SHADOWY_ENVOY_MARKER, player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      //If Janine's card was played, draw cards until you have 8 in hand.
      if (HAS_MARKER(this.PLAY_JANINES_SECRET_ART_MARKER, player, this)) {
        /*When I tried to use the prefab to draw cards, I received this error:
        Argument of type 'PowerEffect' is not assignable to parameter of type 'AttackEffect'.
          Type 'PowerEffect' is missing the following properties from type 'AttackEffect': opponent, attack, damage, ignoreWeakness, and 3 more.ts(2345)*/
        //DRAW_CARDS_UNTIL_YOU_HAVE_X_CARDS_IN_HAND(8, effect, state);
        while (player.hand.cards.length < 8) {
          if (player.deck.cards.length === 0) {
            break;
          }
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
        }
        //Mark the Pokémon to indicate that the ability has already been used.
        ADD_MARKER(this.SHADOWY_ENVOY_MARKER, player, this);
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });
      } else {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      return state;
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.PLAY_JANINES_SECRET_ART_MARKER, this);
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.PLAY_JANINES_SECRET_ART_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      ADD_POISON_TO_PLAYER_ACTIVE(store, state, opponent, this, 20);
    }
    return state;
  }
}