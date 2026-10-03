import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, BoardEffect } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, ChooseCardsPrompt, ShuffleDeckPrompt, GameError, PlayerType } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Thwackey extends PokemonCard {

  public regulationMark = 'H';

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Grookey';

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 100;

  public weakness = [{ type: CardType.FIRE }];

  public resistance = [];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Boom Boom Groove',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, if your Active Pokémon has the Festival Lead Ability, you may search your deck for a card and put it into your hand. Then, shuffle your deck.'

  }];

  public attacks = [
    {
      name: 'Beat',
      cost: [CardType.GRASS, CardType.GRASS],
      damage: 50,
      text: ''
    }
  ];

  public set: string = 'TWM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '15';

  public name: string = 'Thwackey';

  public fullName: string = 'Thwackey TWM';

  public readonly BOOM_BOOM_DRUM_MARKER = 'BOOM_BOOM_DRUM_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.BOOM_BOOM_DRUM_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.BOOM_BOOM_DRUM_MARKER, this)) {
      const player = effect.player;
      player.marker.removeMarker(this.BOOM_BOOM_DRUM_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      // if (activePokemon && activePokemon.powers[0].name !== 'Fesival Lead') {
      //   throw new GameError(GameMessage.CANNOT_USE_POWER);
      // }

      if (player.marker.hasMarker(this.BOOM_BOOM_DRUM_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const activePokemon = player.active.getPokemonCard();
      if (activePokemon && activePokemon.powers) {
        const hasFestivalLead = activePokemon.powers.some(power => power.name === 'Festival Lead');

        if (!hasFestivalLead) {
          throw new GameError(GameMessage.CANNOT_USE_POWER);
        }

        if (hasFestivalLead) {

          player.marker.addMarker(this.BOOM_BOOM_DRUM_MARKER, this);

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });

          return store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.deck,
            {},
            { min: 1, max: 1, allowCancel: false }
          ), cards => {
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

            return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
              player.deck.applyOrder(order);

            });
          });
        }
      }
    }
    return state;
  }
}