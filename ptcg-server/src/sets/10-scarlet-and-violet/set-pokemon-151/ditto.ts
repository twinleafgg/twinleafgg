import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';

import { StoreLike, State, GameError, GameMessage, Card, ChooseCardsPrompt, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Ditto extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 60;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Transformative Start',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your first turn, if this Pokémon is in the Active Spot, you may search your deck and choose a Basic Pokémon you find there, except any Ditto. If you do, discard this Pokémon and all attached cards, and put the chosen Pokémon in its place. Then, shuffle your deck.'
  }];

  public attacks = [{
    name: 'Splup',
    cost: [CardType.COLORLESS],
    damage: 10,
    text: ''
  }];

  public set: string = 'MEW';

  public regulationMark = 'G';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '132';

  public name: string = 'Ditto';

  public fullName: string = 'Ditto MEW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      // Get current turn
      const turn = state.turn;

      if (player.active.cards[0] !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name == 'Ditto') {
          blocked.push(index);
        }
      });

      // Check if it is player's first turn
      if (turn > 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      } else {

        let cards: Card[] = [];
        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.deck,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 0, max: 1, allowCancel: true, blocked }
        ), selectedCards => {
          cards = selectedCards || [];

          cards.forEach((card) => {
            effect.player.removePokemonEffects(player.active);
            MOVE_CARDS(store, state, player.active, player.discard, { sourceCard: this });
            MOVE_CARDS(store, state, player.deck, player.active, { cards: [card], sourceCard: this });
            // const pokemonPlayed = new PlayPokemonEffect(player, card as PokemonCard, player.active);
            // this.reduceEffect(store, state, pokemonPlayed);
            player.active.pokemonPlayedTurn = state.turn;
            effect.player.removePokemonEffects(player.active);
          });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);
          });
        }
        );

      }

    }
    return state;
  }
}
