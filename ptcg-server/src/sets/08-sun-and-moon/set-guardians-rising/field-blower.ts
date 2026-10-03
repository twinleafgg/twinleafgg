import {
  CardTarget,
  ChoosePokemonPrompt,
  GameError,
  GameLog,
  GameMessage,
  PlayerType,
  SelectOptionPrompt,
  SlotType,
  StateUtils,
} from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { CardList } from '../../../game/store/state/card-list';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';

export class FieldBlower extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'GRI';

  public name: string = 'Field Blower';

  public fullName: string = 'Field Blower GRI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '125';

  public text: string =
    "Choose up to 2 in any combination of Pokémon Tool cards and Stadium cards in play (yours or your opponent's) and discard them.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Count Pokémon with tools and build blocked list
      let pokemonsWithTool = 0;
      const blocked: CardTarget[] = [];

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList.tools.length > 0) {
          pokemonsWithTool += 1;
        } else {
          blocked.push(target);
        }
      });

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList.tools.length > 0) {
          pokemonsWithTool += 1;
        } else {
          blocked.push(target);
        }
      });

      const stadiumCard = StateUtils.getStadiumCard(state);

      // Check if card can be played
      if (pokemonsWithTool === 0 && stadiumCard === undefined) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Prevent default effect and move card to supporter pile temporarily
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      // Handle the case where only stadium is in play
      if (pokemonsWithTool === 0 && stadiumCard !== undefined) {
        const cardList = StateUtils.findCardList(state, stadiumCard);
        const owner = StateUtils.findOwner(state, cardList);
        MOVE_CARDS(store, state, cardList, owner.discard, { sourceCard: this });
        store.log(state, GameLog.LOG_PLAYER_DISCARDS_WITH_FIELD_BLOWER, {
          name: player.name,
          card: stadiumCard.name,
          effectName: this.name,
        });
        MOVE_CARDS(store, state, player.supporter, player.discard, {
          cards: [this],
          sourceCard: this,
        });
        return state;
      }

      // Handle the case where only Pokémon tools are in play
      if (pokemonsWithTool >= 1 && stadiumCard === undefined) {
        return this.handlePokemonToolDiscard(store, state, player, blocked, 2);
      }

      // Handle the case where both stadium and Pokémon tools are in play
      if (pokemonsWithTool >= 1 && stadiumCard !== undefined) {
        return store.prompt(
          state,
          new SelectOptionPrompt(
            player.id,
            GameMessage.CHOOSE_OPTION,
            [
              'Discard the Stadium card and up to 1 Pokémon Tool card.',
              'Discard up to 2 Pokémon Tool cards.',
            ],
            { allowCancel: false },
          ),
          (choice) => {
            if (choice === 0) {
              // YES - discard stadium and up to 1 tool
              const cardList = StateUtils.findCardList(state, stadiumCard);
              const owner = StateUtils.findOwner(state, cardList);
              MOVE_CARDS(store, state, cardList, owner.discard, { sourceCard: this });
              store.log(state, GameLog.LOG_PLAYER_DISCARDS_WITH_FIELD_BLOWER, {
                name: player.name,
                card: stadiumCard.name,
                effectName: this.name,
              });

              // Allow up to 1 Pokémon tool discard
              return this.handlePokemonToolDiscard(store, state, player, blocked, 1);
            } else {
              // NO - discard up to 2 tools
              return this.handlePokemonToolDiscard(store, state, player, blocked, 2);
            }
          },
        );
      }
      return state;
    }
    return state;
  }

  private handlePokemonToolDiscard(
    store: StoreLike,
    state: State,
    player: any,
    blocked: CardTarget[],
    maxTools: number,
  ): State {
    return store.prompt(
      state,
      new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
        PlayerType.ANY,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 0, max: maxTools, allowCancel: false, blocked },
      ),
      (results) => {
        const targets = results || [];

        if (targets.length === 0) {
          // No Pokémon selected, just discard the Field Blower
          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [this],
            sourceCard: this,
          });
          return state;
        }

        // Process tool discards sequentially
        this.processToolDiscards(store, state, player, targets, 0, () => {
          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [this],
            sourceCard: this,
          });
        });

        return state;
      },
    );
  }

  private processToolDiscards(
    store: StoreLike,
    state: State,
    player: any,
    targets: any[],
    index: number,
    onComplete: () => void,
  ): void {
    if (index >= targets.length) {
      onComplete();
      return;
    }

    const target = targets[index];
    const owner = StateUtils.findOwner(state, target);

    if (target.tools.length === 1) {
      // Single tool, discard it directly
      const tool = target.tools[0];
      MOVE_CARDS(store, state, target, owner.discard, { cards: [tool], sourceCard: this });
      store.log(state, GameLog.LOG_PLAYER_DISCARDS_WITH_FIELD_BLOWER, {
        name: player.name,
        card: tool.name,
        effectName: this.name,
      });
      this.processToolDiscards(store, state, player, targets, index + 1, onComplete);
    } else if (target.tools.length > 1) {
      // Multiple tools, prompt for selection
      const toolList = new CardList();
      toolList.cards = [...target.tools];

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          toolList,
          { trainerType: TrainerType.TOOL },
          { min: 1, max: 1, allowCancel: false },
        ),
        (selectedTools) => {
          if (selectedTools && selectedTools.length > 0) {
            const tool = selectedTools[0];
            MOVE_CARDS(store, state, target, owner.discard, { cards: [tool], sourceCard: this });
            store.log(state, GameLog.LOG_PLAYER_DISCARDS_WITH_FIELD_BLOWER, {
              name: player.name,
              card: tool.name,
              effectName: this.name,
            });
          }
          this.processToolDiscards(store, state, player, targets, index + 1, onComplete);
        },
      );
    } else {
      // No tools on this Pokémon, continue to next
      this.processToolDiscards(store, state, player, targets, index + 1, onComplete);
    }
  }
}
