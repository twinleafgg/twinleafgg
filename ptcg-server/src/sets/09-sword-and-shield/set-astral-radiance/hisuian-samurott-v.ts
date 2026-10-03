import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PlayerType,
  SlotType,
  CardTarget,
  ChoosePokemonPrompt,
  GameMessage,
  PokemonCardList,
  StateUtils,
  ChooseCardsPrompt,
  TrainerType,
} from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { CardList } from '../../../game/store/state/card-list';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HisuianSamurottV extends PokemonCard {
  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.DARK];

  public hp: number = 220;

  protected _tags = [CardTag.POKEMON_V];

  public weakness = [{ type: CardType.GRASS }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Basket Crash',
      cost: [CardType.DARK],
      damage: 0,
      text: "Discard up to 2 Pokémon Tools from your opponent's Pokémon.",
    },
    {
      name: 'Shadow Slash',
      cost: [CardType.DARK, CardType.DARK, CardType.DARK],
      damage: 180,
      text: 'Discard an Energy from this Pokémon.',
    },
  ];

  public set: string = 'ASR';

  public regulationMark = 'F';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '101';

  public name: string = 'Hisuian Samurott V';

  public fullName: string = 'Hisuian Samurott V ASR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let pokemonsWithTool = 0;
      const blocked: CardTarget[] = [];
      const validTargets: PokemonCardList[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList.tools.length > 0) {
          pokemonsWithTool += 1;
          validTargets.push(cardList);
        } else {
          blocked.push(target);
        }
      });

      if (pokemonsWithTool === 0) {
        return state;
      }

      const max = Math.min(2, pokemonsWithTool);
      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: max, allowCancel: false, blocked },
        ),
        (results) => {
          const chosenPokemons = results || [];
          if (chosenPokemons.length === 0) {
            return state;
          }

          // If only one Pokémon is chosen and it has more than one tool, allow discarding up to 2 tools from it
          if (chosenPokemons.length === 1 && chosenPokemons[0].tools.length > 1) {
            const toolList = new CardList();
            toolList.cards = [...chosenPokemons[0].tools];
            return store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_DISCARD, // You may want a new message for 'choose tool(s) to discard'
                toolList,
                { trainerType: TrainerType.TOOL },
                { min: 1, max: 2, allowCancel: false },
              ),
              (selectedTools) => {
                if (selectedTools && selectedTools.length > 0) {
                  const owner = StateUtils.findOwner(state, chosenPokemons[0]);
                  selectedTools.forEach((tool) => {
                    MOVE_CARDS(store, state, chosenPokemons[0], owner.discard, { cards: [tool], sourceCard: this });
                  });
                }
                return state;
              },
            );
          }

          // If two Pokémon are chosen, discard one tool from each
          chosenPokemons.forEach((pokemon) => {
            if (pokemon.tools.length === 1) {
              const owner = StateUtils.findOwner(state, pokemon);
              MOVE_CARDS(store, state, pokemon, owner.discard, { cards: [pokemon.tools[0]], sourceCard: this });
            } else if (pokemon.tools.length > 1) {
              // Prompt to choose which tool to discard from this Pokémon
              const toolList = new CardList();
              toolList.cards = [...pokemon.tools];
              store.prompt(
                state,
                new ChooseCardsPrompt(
                  player,
                  GameMessage.CHOOSE_CARD_TO_DISCARD, // You may want a new message for 'choose tool to discard'
                  toolList,
                  { trainerType: TrainerType.TOOL },
                  { min: 1, max: 1, allowCancel: false },
                ),
                (selectedTools) => {
                  if (selectedTools && selectedTools.length === 1) {
                    const tool = selectedTools[0];
                    const owner = StateUtils.findOwner(state, pokemon);
                    MOVE_CARDS(store, state, pokemon, owner.discard, { cards: [tool], sourceCard: this });
                  }
                  return state;
                },
              );
            }
          });
          return state;
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
    }

    return state;
  }
}
