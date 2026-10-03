import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameError,
  GameMessage,
  PlayerType,
  SlotType,
  ChoosePokemonPrompt,
  CardTarget,
  GameStoreMessage,
  PokemonCard,
  Card,
  ChooseCardsPrompt,
} from '../../../game';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {DEVOLVE_POKEMON, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';

export class SurpriseTimeMachine extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.ROCKETS_SECRET_MACHINE];
  public set: string = 'TRR';
  public name: string = 'Surprise! Time Machine';
  public fullName: string = 'Surprise! Time Machine TRR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '91';
  public text =
    'Choose 1 of your Evolved Pokémon, remove the highest Stage Evolution card from it, and shuffle it into your deck (this counts as devolving that Pokémon). If that Pokémon remains in play, search your deck for an Evolution card that evolves from that Pokémon and put it onto that Pokémon (this counts as evolving that Pokémon). Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      let canDevolve = false;
      const player = effect.player;
      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (list.getPokemons().length > 1) {
          canDevolve = true;
        } else {
          blocked.push(target);
        }
      });

      if (!canDevolve) {
        throw new GameError(GameStoreMessage.CANNOT_PLAY_THIS_CARD);
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, min: 1, max: 1, blocked },
        ),
        (results) => {
          if (results && results.length > 0) {
            const targetPokemon = results[0];

            //Devolve
            DEVOLVE_POKEMON(store, state, targetPokemon, player.deck);

            //Evolve
            const blocked2: number[] = [];
            player.deck.cards.forEach((card, index) => {
              if (
                card instanceof PokemonCard &&
                card.evolvesFrom !== targetPokemon.cards[targetPokemon.cards.length - 1].name
              ) {
                blocked2.push(index);
              }
            });

            //Death Check?
            const checkHpEffect = new CheckHpEffect(player, targetPokemon);
            store.reduceEffect(state, checkHpEffect);
            if (targetPokemon.damage >= checkHpEffect.hp) {
              SHUFFLE_DECK(store, state, player);

              return state;
            }

            let cards: Card[] = [];
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_EVOLVE,
                player.deck,
                { superType: SuperType.POKEMON },
                { min: 0, max: 1, allowCancel: false, blocked: blocked2 },
              ),
              (selected) => {
                cards = selected || [];
                if (cards.length !== 0) {
                  const evolution = cards[0] as PokemonCard;
                  MOVE_CARDS(store, state, player.deck, targetPokemon, { cards: [evolution], sourceCard: this });
                }
                SHUFFLE_DECK(store, state, player);
              },
            );
            targetPokemon.clearEffects();
            targetPokemon.pokemonPlayedTurn = state.turn;
          }

          return state;
        },
      );
    }

    return state;
  }
}
