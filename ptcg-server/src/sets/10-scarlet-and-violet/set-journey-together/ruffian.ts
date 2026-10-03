import {
  CardTarget,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  EnergyType,
  GameError,
  GameMessage,
  Player,
  PlayerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
  SuperType,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Ruffian extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'I';
  public set: string = 'JTG';
  public name: string = 'Ruffian';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '157';
  public fullName: string = 'Ruffian JTG';

  public text: string =
    "Discard a Pokémon Tool and a Special Energy from 1 of your opponent's Pokémon.";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    const opponent = StateUtils.getOpponent(state, player);
    let hasTarget = false;
    opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
      if (cardList.energies.cards.length > 0 || cardList.tools.length > 0) {
        hasTarget = true;
      }
    });
    if (!hasTarget) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      let energyOrToolcard = false;
      const blocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (
          cardList.energies.cards.some(
            (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.SPECIAL,
          )
        ) {
          energyOrToolcard = true;
        } else if (
          cardList.tools.some((c) => c instanceof TrainerCard && c.trainerType === TrainerType.TOOL)
        ) {
          energyOrToolcard = true;
        } else {
          blocked.push(target);
        }
      });

      if (!energyOrToolcard) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, blocked },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return;
          }

          const target = targets[0];

          // removing the tool
          if (target.tools.length > 0) {
            const toolToDiscard = target.tools[0];
            if (target.tools.length > 1) {
              return store.prompt(
                state,
                new ChooseCardsPrompt(
                  player,
                  GameMessage.CHOOSE_CARD_TO_DISCARD,
                  target,
                  { superType: SuperType.TRAINER, trainerType: TrainerType.TOOL },
                  { min: 1, max: 1, allowCancel: false },
                ),
                (selected) => {
                  if (selected && selected.length > 0) {
                    MOVE_CARDS(store, state, target, opponent.discard, {
                      cards: [selected[0]],
                      sourceCard: this,
                    });
                  }
                  // continue to energy discard
                  // removing special energies
                  let specialEnergies = 0;
                  target.energies.cards.forEach((card) => {
                    if (
                      card.superType === SuperType.ENERGY &&
                      card.energyType === EnergyType.SPECIAL
                    ) {
                      specialEnergies++;
                    }
                  });

                  if (specialEnergies > 0) {
                    store.prompt(
                      state,
                      new ChooseCardsPrompt(
                        player,
                        GameMessage.CHOOSE_CARD_TO_DISCARD,
                        target,
                        { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
                        { min: 1, max: 1, allowCancel: false },
                      ),
                      (selected) => {
                        MOVE_CARDS(store, state, target, opponent.discard, {
                          cards: selected,
                          sourceCard: this,
                        });
                        MOVE_CARDS(store, state, player.supporter, player.discard, {
                          sourceCard: this,
                        });
                      },
                    );
                  } else {
                    MOVE_CARDS(store, state, player.supporter, player.discard, {
                      sourceCard: this,
                    });
                  }
                },
              );
            } else {
              MOVE_CARDS(store, state, target, opponent.discard, {
                cards: [toolToDiscard],
                sourceCard: this,
              });
            }
          }

          // removing special energies
          let specialEnergies = 0;
          target.energies.cards.forEach((card) => {
            if (card.superType === SuperType.ENERGY && card.energyType === EnergyType.SPECIAL) {
              specialEnergies++;
            }
          });

          if (specialEnergies > 0) {
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_DISCARD,
                target,
                { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
                { min: 1, max: 1, allowCancel: false },
              ),
              (selected) => {
                MOVE_CARDS(store, state, target, opponent.discard, {
                  cards: selected,
                  sourceCard: this,
                });
                MOVE_CARDS(store, state, player.supporter, player.discard, { sourceCard: this });
              },
            );
          } else {
            MOVE_CARDS(store, state, player.supporter, player.discard, { sourceCard: this });
          }
        },
      );
    }

    return state;
  }
}
