import {
  Card,
  CardTarget,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCard,
  PokemonCardList,
  SelectPrompt,
  SlotType,
  StateUtils,
  pokemonHasCardType,
} from '../../../game';
import {
  CardType,
  EnergyType,
  Stage,
  SuperType,
  TrainerType,
} from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { SupporterEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class DangerousDrill extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'TEU';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '138';
  public name: string = 'Dangerous Drill';
  public fullName: string = 'Dangerous Drill TEU';

  public text: string =
    "You can play this card only if you discard a [D] Pokémon from your hand.\n\nDiscard a Pokémon Tool or Special Energy card from 1 of your opponent's Pokémon, or discard any Stadium card in play.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (
        !player.hand.cards.some(
          (c) => c instanceof PokemonCard && pokemonHasCardType(c, CardType.DARK),
        )
      ) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.POKEMON, cardType: [CardType.DARK] },
          { allowCancel: true, min: 1, max: 1 },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }

          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
        },
      );

      let pokemonsWithTool = 0;
      const blocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList.tools.length > 0) {
          pokemonsWithTool += 1;
        } else {
          blocked.push(target);
        }
      });

      let specialEnergy = 0;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (
          cardList.energies.cards.some(
            (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.SPECIAL,
          )
        ) {
          specialEnergy += 1;
        }
      });

      const stadiumCard = StateUtils.getStadiumCard(state);

      if (pokemonsWithTool === 0 && stadiumCard == undefined && specialEnergy === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      const toolOption = {
        message: GameMessage.CHOICE_TOOL,
        action: () => {
          let targets: PokemonCardList[] = [];
          return store.prompt(
            state,
            new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
              PlayerType.TOP_PLAYER,
              [SlotType.ACTIVE, SlotType.BENCH],
              { min: 1, max: 1, allowCancel: false, blocked },
            ),
            (results) => {
              targets = results || [];

              if (targets.length === 0) {
                return state;
              }

              const cardList = targets[0];

              if (cardList.isStage(Stage.BASIC)) {
                try {
                  const supporterEffect = new SupporterEffect(player, effect.trainerCard);
                  store.reduceEffect(state, supporterEffect);
                } catch {
                  return state;
                }
              }

              targets.forEach((target) => {
                const owner = StateUtils.findOwner(state, target);
                if (target.tools.length > 0) {
                  MOVE_CARDS(store, state, target, owner.discard, {
                    cards: [target.tools[0]],
                    sourceCard: this,
                  });
                  target.tools = [];
                }

                MOVE_CARDS(store, state, player.supporter, player.discard, {
                  cards: [this],
                  sourceCard: this,
                });
                return state;
              });

              MOVE_CARDS(store, state, player.supporter, player.discard, {
                cards: [this],
                sourceCard: this,
              });
              return state;
            },
          );
        },
      };

      const stadiumOption = {
        message: GameMessage.CHOICE_STADIUM,
        action: () => {
          const stadiumCard = StateUtils.getStadiumCard(state);
          if (stadiumCard == undefined) {
            throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
          }

          // Discard Stadium
          const cardList = StateUtils.findCardList(state, stadiumCard);
          const owner = StateUtils.findOwner(state, cardList);
          MOVE_CARDS(store, state, cardList, owner.discard, { sourceCard: this });

          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [this],
            sourceCard: this,
          });
          return state;
        },
      };

      const specialEnergyBlocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (
          cardList.energies.cards.some(
            (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.SPECIAL,
          )
        ) {
          return;
        } else {
          specialEnergyBlocked.push(target);
        }
      });

      const specialEnergyOption = {
        message: GameMessage.CHOICE_SPECIAL_ENERGY,
        action: () => {
          return store.prompt(
            state,
            new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
              PlayerType.TOP_PLAYER,
              [SlotType.ACTIVE, SlotType.BENCH],
              { allowCancel: false, blocked: specialEnergyBlocked },
            ),
            (results) => {
              if (results.length === 0) {
                return state;
              }

              const target = results[0];
              let cards: Card[] = [];

              state = store.prompt(
                state,
                new ChooseCardsPrompt(
                  player,
                  GameMessage.CHOOSE_CARD_TO_DISCARD,
                  target,
                  { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
                  { min: 1, max: 1, allowCancel: false },
                ),
                (selected) => {
                  cards = selected || [];
                  if (cards.length > 0) {
                    MOVE_CARDS(store, state, target, opponent.discard, {
                      cards: cards,
                      sourceCard: this,
                    });
                  }

                  return state;
                },
              );
            },
          );
        },
      };

      const options: { message: GameMessage; action: () => void }[] = [];

      if (pokemonsWithTool > 0) {
        options.push(toolOption);
      }

      if (specialEnergy > 0) {
        options.push(specialEnergyOption);
      }

      if (stadiumCard !== undefined) {
        options.push(stadiumOption);
      }

      return store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.DISCARD_STADIUM_OR_TOOL_OR_SPECIAL_ENERGY,
          options.map((c) => c.message),
          { allowCancel: false },
        ),
        (choice) => {
          const option = options[choice];

          if (option.action) {
            option.action();
          }

          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [this],
            sourceCard: this,
          });
          return state;
        },
      );
    }
    return state;
  }
}
