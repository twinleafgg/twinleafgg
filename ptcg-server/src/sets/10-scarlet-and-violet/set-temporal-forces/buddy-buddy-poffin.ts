import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  ChooseCardsPrompt,
  GameMessage,
  GameError,
  ShuffleDeckPrompt,
  PokemonCard,
  Player,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  PlayPokemonFromDeckEffect,
  TrainerEffect,
} from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class BuddyBuddyPoffin extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'TEF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '144';
  public regulationMark = 'H';
  public name: string = 'Buddy-Buddy Poffin';
  public fullName: string = 'Buddy-Buddy Poffin TEF';
  public text: string =
    'Search your deck for up to 2 Basic Pokémon with 70 HP or less and put them onto your Bench. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.deck.cards.length === 0) {
      return false;
    }
    const openSlots = player.bench.filter((b) => b.cards.length === 0);
    if (openSlots.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const openSlots = player.bench.filter((b) => b.cards.length === 0);

      if (player.deck.cards.length === 0 || openSlots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked = player.deck.cards.reduce((acc, c, index) => {
        if (!(c instanceof PokemonCard && c.stage === Stage.BASIC && c.hp <= 70)) {
          acc.push(index);
        }
        return acc;
      }, [] as number[]);

      const maxPokemons = Math.min(openSlots.length, 2);
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.deck,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 0, max: maxPokemons, allowCancel: false, blocked, maxPokemons },
        ),
        (selectedCards) => {
          const cards = selectedCards || [];

          cards.forEach((card, index) => {
            const playPokemonFromDeckEffect = new PlayPokemonFromDeckEffect(
              player,
              card as any,
              openSlots[index],
            );
            store.reduceEffect(state, playPokemonFromDeckEffect);
          });

          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [this],
            sourceCard: this,
          });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
            return state;
          });
        },
      );
    }
    return state;
  }
}
