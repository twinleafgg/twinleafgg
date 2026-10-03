import {
  Card,
  CardTarget,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  PlayerType,
  PokemonCard,
  SlotType,
} from '../../../game';
import { GameLog, GameMessage } from '../../../game/game-message';
import { CardTag, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {MOVE_CARD_TO, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class SwoopTeleporter extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.ROCKETS_SECRET_MACHINE];
  public set: string = 'TRR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '92';
  public name: string = 'Swoop! Teleporter';
  public fullName: string = 'Swoop! Teleporter TRR';

  public text: string =
    'Search your deck for a Basic Pokémon (excluding Pokémon-ex) and switch it with 1 of your Basic Pokémon (excluding Pokémon-ex) in play. (Any cards attached to that Pokémon, damage counters, Special Conditions, and effects on it are now on the new Pokémon.) Place the first Basic Pokémon in the discard pile. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (card.stage !== Stage.BASIC || card.hasTag(CardTag.POKEMON_ex)) {
          blocked.push(target);
        }
      });

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, blocked },
        ),
        (results) => {
          const target = results || [];

          if (target.length === 0) {
            return state;
          }

          const blocked: number[] = [];
          player.deck.cards.forEach((c, index) => {
            if (c instanceof PokemonCard && c.hasTag(CardTag.POKEMON_ex)) {
              blocked.push(index);
            }
          });

          let cards: Card[] = [];
          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARDS,
              player.deck,
              { superType: SuperType.POKEMON, stage: Stage.BASIC },
              { min: 0, max: 1, allowCancel: false, blocked },
            ),
            (selectedCards) => {
              cards = selectedCards || [];

              if (cards.length === 0) {
                return state;
              }

              // Discard the pokemon
              target[0].cards.forEach((c) => {
                if (c instanceof PokemonCard && !target[0].energies.cards.includes(c)) {
                  MOVE_CARD_TO(state, c, player.discard);
                }
              });

              // Move the selected card to the bench slot
              cards.forEach((card, index) => {
                MOVE_CARD_TO(state, card, target[0]);
              });

              store.log(state, GameLog.LOG_PLAYER_SWITCHES_POKEMON_WITH_POKEMON_FROM_DECK, {
                name: player.name,
                card: target[0].getPokemonCard()!.name,
                secondCard: cards[0].name,
              });

              SHUFFLE_DECK(store, state, player);
            },
          );
        },
      );
    }

    return state;
  }
}
