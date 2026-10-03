import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { GamePhase, State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { GameError, GameMessage, PowerType, StateUtils } from '../../../game';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {ABILITY_USED,
  ADD_MARKER,
  BLOCK_IF_GX_ATTACK_USED,
  HAS_MARKER,
  REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN,
  SWITCH_ACTIVE_WITH_BENCHED,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class OricorioGX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_GX];
  public cardType: CardType[] = [CardType.PSYCHIC];
  public weakness = [{ type: CardType.DARK }];
  public resistance = [{ type: CardType.FIGHTING, value: -20 }];
  public hp: number = 170;
  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Dance of Tribute',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      text: "Once during your turn (before your attack), if any of your Pokémon were Knocked Out during your opponent's last turn, you may draw 3 cards. You can't use more than 1 Dance of Tribute Ability each turn.",
    },
  ];

  public attacks = [
    {
      name: 'Razor Wing',
      cost: [CardType.PSYCHIC, CardType.COLORLESS, CardType.COLORLESS],
      damage: 80,
      text: '',
    },
    {
      name: 'Strafe-GX',
      cost: [CardType.PSYCHIC, CardType.COLORLESS, CardType.COLORLESS],
      damage: 100,
      text:
        'Switch this Pokémon with 1 of your Benched Pokémon.' +
        " (You can't use more than 1 GX attack in a game.) ",
    },
  ];

  public set: string = 'CEC';
  public setNumber: string = '95';
  public cardImage: string = 'assets/cardback.png';
  public name = 'Oricorio-GX';
  public fullName = 'Oricorio GX CEC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    //Dance of Tribute
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (!HAS_MARKER('OPPONENT_KNOCKOUT_MARKER', player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      //Once per turn only
      if (player.usedTributeDance == true) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
      player.usedTributeDance = true;

      ABILITY_USED(player, this);
    }

    if (effect instanceof KnockOutEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Do not activate between turns, or when it's not opponents turn.
      if (state.phase !== GamePhase.ATTACK || state.players[state.activePlayer] !== opponent) {
        return state;
      }

      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner === player) {
        ADD_MARKER('OPPONENT_KNOCKOUT_MARKER', player, this);
      }
      return state;
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (owner === player) {
        REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN(effect, 'OPPONENT_KNOCKOUT_MARKER', this);
      }
      player.usedTributeDance = false;
    }

    //Strafe GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
    }

    return state;
  }
}
