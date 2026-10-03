import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import { GameMessage, StoreLike, State, TrainerCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import {WAS_ATTACK_USED, SHOW_CARDS_TO_PLAYER, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';

export class Raticate extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Rattata';
  public cardType: CardType[] = [C];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public retreat = [];

  public attacks = [
    {
      name: 'Transfer Junk',
      cost: [C],
      damage: 0,
      text: 'Put a Team Plasma Pokémon, a Team Plasma Trainer card, and a Team Plasma Energy card from your discard pile into your hand.',
    },
    {
      name: 'Bite',
      cost: [C, C],
      damage: 30,
      text: '',
    },
  ];

  public set: string = 'PLF';
  public setNumber: string = '88';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Raticate';
  public fullName: string = 'Raticate PLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Step 1: Choose a Team Plasma Pokemon from discard
      const plasmaPokemonBlocked: number[] = [];
      player.discard.cards.forEach((card, index) => {
        const isPlasmaPokemon = card instanceof PokemonCard && card.hasTag(CardTag.TEAM_PLASMA);
        if (!isPlasmaPokemon) {
          plasmaPokemonBlocked.push(index);
        }
      });

      const hasPlasmaPokemon = plasmaPokemonBlocked.length < player.discard.cards.length;

      if (hasPlasmaPokemon) {
        store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.discard,
            { superType: SuperType.POKEMON },
            { min: 0, max: 1, allowCancel: true, blocked: plasmaPokemonBlocked },
          ),
          (selectedPokemon) => {
            const cardsToHand = selectedPokemon || [];

            // Step 2: Choose a Team Plasma Trainer from discard
            const plasmaTrainerBlocked: number[] = [];
            player.discard.cards.forEach((card, index) => {
              const isPlasmaTrainer =
                card instanceof TrainerCard && card.hasTag(CardTag.TEAM_PLASMA);
              if (!isPlasmaTrainer) {
                plasmaTrainerBlocked.push(index);
              }
            });

            const hasPlasmaTrainer = plasmaTrainerBlocked.length < player.discard.cards.length;

            if (hasPlasmaTrainer) {
              store.prompt(
                state,
                new ChooseCardsPrompt(
                  player,
                  GameMessage.CHOOSE_CARD_TO_HAND,
                  player.discard,
                  { superType: SuperType.TRAINER },
                  { min: 0, max: 1, allowCancel: true, blocked: plasmaTrainerBlocked },
                ),
                (selectedTrainer) => {
                  cardsToHand.push(...(selectedTrainer || []));

                  // Step 3: Choose a Team Plasma Energy from discard
                  const plasmaEnergyBlocked: number[] = [];
                  player.discard.cards.forEach((card, index) => {
                    const isPlasmaEnergy =
                      card.superType === SuperType.ENERGY && card.hasTag(CardTag.TEAM_PLASMA);
                    if (!isPlasmaEnergy) {
                      plasmaEnergyBlocked.push(index);
                    }
                  });

                  const hasPlasmaEnergy = plasmaEnergyBlocked.length < player.discard.cards.length;

                  if (hasPlasmaEnergy) {
                    store.prompt(
                      state,
                      new ChooseCardsPrompt(
                        player,
                        GameMessage.CHOOSE_CARD_TO_HAND,
                        player.discard,
                        { superType: SuperType.ENERGY },
                        { min: 0, max: 1, allowCancel: true, blocked: plasmaEnergyBlocked },
                      ),
                      (selectedEnergy) => {
                        cardsToHand.push(...(selectedEnergy || []));
                        if (cardsToHand.length > 0) {
                          SHOW_CARDS_TO_PLAYER(store, state, opponent, cardsToHand);
                          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cardsToHand, sourceCard: this });
                        }
                      },
                    );
                  } else {
                    if (cardsToHand.length > 0) {
                      SHOW_CARDS_TO_PLAYER(store, state, opponent, cardsToHand);
                      MOVE_CARDS(store, state, player.discard, player.hand, { cards: cardsToHand, sourceCard: this });
                    }
                  }
                },
              );
            } else {
              // Step 3 (no trainer): Choose a Team Plasma Energy from discard
              const plasmaEnergyBlocked: number[] = [];
              player.discard.cards.forEach((card, index) => {
                const isPlasmaEnergy =
                  card.superType === SuperType.ENERGY && card.hasTag(CardTag.TEAM_PLASMA);
                if (!isPlasmaEnergy) {
                  plasmaEnergyBlocked.push(index);
                }
              });

              const hasPlasmaEnergy = plasmaEnergyBlocked.length < player.discard.cards.length;

              if (hasPlasmaEnergy) {
                store.prompt(
                  state,
                  new ChooseCardsPrompt(
                    player,
                    GameMessage.CHOOSE_CARD_TO_HAND,
                    player.discard,
                    { superType: SuperType.ENERGY },
                    { min: 0, max: 1, allowCancel: true, blocked: plasmaEnergyBlocked },
                  ),
                  (selectedEnergy) => {
                    cardsToHand.push(...(selectedEnergy || []));
                    if (cardsToHand.length > 0) {
                      SHOW_CARDS_TO_PLAYER(store, state, opponent, cardsToHand);
                      MOVE_CARDS(store, state, player.discard, player.hand, { cards: cardsToHand, sourceCard: this });
                    }
                  },
                );
              } else {
                if (cardsToHand.length > 0) {
                  SHOW_CARDS_TO_PLAYER(store, state, opponent, cardsToHand);
                  MOVE_CARDS(store, state, player.discard, player.hand, { cards: cardsToHand, sourceCard: this });
                }
              }
            }
          },
        );
      }
    }

    return state;
  }
}
