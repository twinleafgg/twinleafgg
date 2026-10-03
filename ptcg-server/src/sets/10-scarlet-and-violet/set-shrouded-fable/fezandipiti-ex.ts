import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, BoardEffect } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { GamePhase, State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {DAMAGE_OPPONENT_POKEMON,
  REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Fezandipitiex extends PokemonCard {
  public stage: Stage = Stage.BASIC;

  protected _tags = [CardTag.POKEMON_ex];

  public regulationMark = 'H';

  public cardType: CardType[] = [CardType.DARK];

  public weakness = [{ type: CardType.FIGHTING }];

  public hp: number = 210;

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Flip the Script',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      text: "Once during your turn, if any of your Pokémon were Knocked Out during your opponent's last turn, you may draw 3 cards. You can't use more than 1 Flip the Script Ability each turn.",
    },
  ];

  public attacks = [
    {
      name: 'Cruel Arrow',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 0,
      text: "This attack does 100 damage to 1 of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'SFA';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '38';

  public name: string = 'Fezandipiti ex';

  public fullName: string = 'Fezandipiti ex SFA';

  public readonly OPPONENT_KNOCKOUT_MARKER = 'OPPONENT_KNOCKOUT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (!player.marker.hasMarker(this.OPPONENT_KNOCKOUT_MARKER)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.usedTableTurner == true) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
      player.usedTableTurner = true;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });
    }

    if (effect instanceof KnockOutEffect) {
      const player = effect.player;

      // Do not activate when it is player's turn
      if (state.players[state.activePlayer] === player) {
        return state;
      }
      // Do not activate between turns
      if (state.phase !== GamePhase.PLAYER_TURN && state.phase !== GamePhase.ATTACK) {
        return state;
      }

      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner === player) {
        effect.player.marker.addMarkerToState(this.OPPONENT_KNOCKOUT_MARKER);
      }
      return state;
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (owner === player) {
        REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN(effect, this.OPPONENT_KNOCKOUT_MARKER);
      }
      player.usedTableTurner = false;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          const targets = selected || [];
          DAMAGE_OPPONENT_POKEMON(store, state, effect, 100, targets);
          return state;
        },
      );
    }

    return state;
  }
}
