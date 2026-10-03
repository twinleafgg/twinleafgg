import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, BoardEffect } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, GameMessage, ChooseCardsPrompt, ShuffleDeckPrompt, GameError, PlayerType, ShowCardsPrompt, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gabite extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Gible';

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 80;

  public weakness = [{ type: CardType.DRAGON }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Dragon Call',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may search your deck for a [N] Pokémon, reveal it, and put it into your hand. Shuffle your deck afterward.'
  }];

  public attacks = [
    {
      name: 'Dragonslice',
      cost: [CardType.WATER, CardType.FIGHTING],
      damage: 20,
      text: ''
    }
  ];

  public set: string = 'DRX';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '89';

  public name: string = 'Gabite';

  public fullName: string = 'Gabite DRX';

  public readonly DRAGON_CALL_MARKER = 'DRAGON_CALL_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.DRAGON_CALL_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.DRAGON_CALL_MARKER, this)) {
      const player = effect.player;
      player.marker.removeMarker(this.DRAGON_CALL_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.marker.hasMarker(this.DRAGON_CALL_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.POKEMON, cardType: [CardType.DRAGON] },
        { min: 0, max: 1, allowCancel: true }
      ), cards => {

        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          store.prompt(state, [new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            cards
          )], () => {
          });
        }

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
          player.marker.addMarker(this.DRAGON_CALL_MARKER, this);
        });
      });
    }

    return state;
  }
}