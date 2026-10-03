import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, BoardEffect } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, GameMessage, StateUtils, Player, CardList, GameError, SelectPrompt, PlayerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {IS_ABILITY_BLOCKED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Kingdra extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public cardType: CardType[] = [CardType.WATER];
  public hp: number = 150;
  public weakness = [{ type: CardType.LIGHTNING }];
  public retreat = [CardType.COLORLESS];
  public evolvesFrom = 'Seadra';

  public powers = [{
    name: 'Seething Currents',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may have either player shuffle their hand and put it on the bottom of their deck. If that player put any cards on the bottom of their deck in this way, they draw 4 cards.'
  }];

  public attacks = [{
    name: 'Hydro Splash',
    cost: [CardType.WATER, CardType.COLORLESS],
    damage: 130,
    text: ''
  }];

  public set: string = 'LOR';
  public regulationMark = 'F';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '37';
  public name: string = 'Kingdra';
  public fullName: string = 'Kingdra LOR';

  public readonly SEETHING_CURRENTS_MARKER = 'SEETHING_CURRENTS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check to see if anything is blocking our Ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      // Can't use ability if already used
      if (player.marker.hasMarker(this.SEETHING_CURRENTS_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const deckBottom = new CardList();
      const opponentDeckBottom = new CardList();

      if (player.hand.cards.length === 0 && opponent.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const options: { message: GameMessage, action: () => void }[] = [
        {
          message: GameMessage.SHUFFLE_OPPONENT_HAND,
          action: () => {

            // Shuffle the opponent's hand
            this.shufflePlayerHand(opponent);

            MOVE_CARDS(store, state, opponent.hand, opponentDeckBottom, { sourceCard: this });

            MOVE_CARDS(store, state, opponentDeckBottom, opponent.deck, { sourceCard: this });

            MOVE_CARDS(store, state, opponent.deck, opponent.hand, { count: 4, sourceCard: this });

          }
        },
        {
          message: GameMessage.SHUFFLE_YOUR_HAND,
          action: () => {

            // Shuffle the player's hand
            this.shufflePlayerHand(player);

            MOVE_CARDS(store, state, player.hand, deckBottom, { sourceCard: this });

            MOVE_CARDS(store, state, deckBottom, player.deck, { sourceCard: this });

            MOVE_CARDS(store, state, player.deck, player.hand, { count: 4, sourceCard: this });

          }
        }

      ];

      player.marker.addMarker(this.SEETHING_CURRENTS_MARKER, this);

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });

      return store.prompt(state, new SelectPrompt(
        player.id,
        GameMessage.CHOOSE_OPTION,
        options.map(opt => opt.message),
        { allowCancel: false }
      ), choice => {
        const option = options[choice];
        option.action();
      });

    }

    if (effect instanceof EndTurnEffect) {
      const player = (effect as EndTurnEffect).player;
      player.marker.removeMarker(this.SEETHING_CURRENTS_MARKER, this);
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      player.marker.removeMarker(this.SEETHING_CURRENTS_MARKER, this);
      return state;
    }

    return state;
  }

  shufflePlayerHand(player: Player): void {
    const hand = player.hand.cards;

    // Shuffle the hand using the Fisher-Yates shuffle algorithm
    for (let i = hand.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [hand[i], hand[j]] = [hand[j], hand[i]];
    }
  }

}