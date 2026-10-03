import {
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  PowerType,
  ShuffleDeckPrompt,
  State,
  StoreLike,
  TrainerCard,
  StateUtils,
} from '../../../game';

import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { CheckPokemonPowersEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';

import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ForestSealStone extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'SIT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '156';
  public regulationMark = 'F';
  public name: string = 'Forest Seal Stone';
  public fullName: string = 'Forest Seal Stone SIT';

  public text: string =
    'The Pokémon V this card is attached to can use the VSTAR Power on this card.';

  public powers = [
    {
      name: 'Star Alchemy',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      exemptFromAbilityLock: true,
      text: "During your turn, you may search your deck for a card and put it into your hand. Then, shuffle your deck. (You can't use more than 1 VSTAR Power in a game.)",
    },
  ];

  public useWhenAttached = true;
  public readonly VSTAR_MARKER = 'VSTAR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof CheckPokemonPowersEffect &&
      !effect.powers.find((p) => p.name === this.powers[0].name)
    ) {
      // Find the PokemonCardList that contains the target PokemonCard
      const cardList = StateUtils.findCardList(state, effect.target);
      if (cardList instanceof PokemonCardList && cardList.tools.includes(this)) {
        const hasValidCard = effect.target.tags.some(
          (tag) =>
            tag === CardTag.POKEMON_V ||
            tag === CardTag.POKEMON_VSTAR ||
            tag === CardTag.POKEMON_VMAX ||
            tag === CardTag.POKEMON_VUNION,
        );

        if (!hasValidCard) {
          return state;
        }

        // Try to reduce ToolEffect, to check if something is blocking the tool from working
        try {
          const stub = new ToolEffect(effect.player, this);
          store.reduceEffect(state, stub);
        } catch {
          return state;
        }

        effect.powers.push(this.powers[0]);
      }
    }

    if (effect instanceof PowerEffect && effect.power === this.powers[0]) {
      const player = effect.player;

      if (player.usedVSTAR === true) {
        throw new GameError(GameMessage.LABEL_VSTAR_USED);
      }

      player.usedVSTAR = true;

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 0, max: 1, allowCancel: false },
        ),
        (cards) => {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
      return state;
    }
    return state;
  }
}
