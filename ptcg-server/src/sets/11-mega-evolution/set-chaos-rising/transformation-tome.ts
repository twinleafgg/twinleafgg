import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  CardTarget,
  GameError,
  GameMessage,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  PlayerType,
  SlotType,
  StoreLike,
  State,
  Player,
} from '../../../game';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TransformationTome extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Transformation Tome';
  public fullName: string = 'Book of Transformation M4';
  public text: string =
    'You must play 2 Transformation Tome cards at once. (This effect works one time for 2 cards.)\n\n' +
    'Choose a Basic Pokémon in your discard pile and switch it with 1 of your Basic Pokémon in play. Any attached cards, damage counters, Special Conditions, turns in play, and any other effects remain on the new Pokémon.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const second = player.hand.cards.find((c) => c.name === this.name && c !== this);
    if (second === undefined) {
      return false;
    }
    const hasBasicInPlay =
      player.active.cards.some((c) => c instanceof PokemonCard && c.stage === Stage.BASIC) ||
      player.bench.some((b) =>
        b.cards.some((c) => c instanceof PokemonCard && c.stage === Stage.BASIC),
      );
    const hasBasicInDiscard = player.discard.cards.some(
      (c) => c instanceof PokemonCard && c.stage === Stage.BASIC,
    );
    if (!hasBasicInPlay || !hasBasicInDiscard) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const name = effect.trainerCard.name;
      const second = player.hand.cards.find((c) => c.name === name && c !== effect.trainerCard);
      if (second === undefined) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      const hasBasicInPlay =
        player.active.cards.some(
          (c) => c instanceof PokemonCard && (c as PokemonCard).stage === Stage.BASIC,
        ) ||
        player.bench.some((b) =>
          b.cards.some((c) => c instanceof PokemonCard && (c as PokemonCard).stage === Stage.BASIC),
        );
      const hasBasicInDiscard = player.discard.cards.some(
        (c) => c instanceof PokemonCard && (c as PokemonCard).stage === Stage.BASIC,
      );
      if (!hasBasicInPlay || !hasBasicInDiscard) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      effect.preventDefault = true;
      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (card && (card as PokemonCard).stage !== Stage.BASIC) {
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
          { min: 1, max: 1, allowCancel: false, blocked },
        ),
        (inPlaySelected) => {
          const inPlayTargets = inPlaySelected || [];
          if (inPlayTargets.length === 0) return state;
          const inPlayList = inPlayTargets[0];
          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
              player.discard,
              { superType: SuperType.POKEMON, stage: Stage.BASIC },
              { min: 1, max: 1, allowCancel: false },
            ),
            (discardSelected) => {
              const fromDiscard = discardSelected || [];
              if (fromDiscard.length === 0) return state;
              const inPlayCard = inPlayList.getPokemonCard();
              if (inPlayCard && inPlayList.cards.length > 0) {
                MOVE_CARDS(store, state, inPlayList, player.discard, { cards: [inPlayList.cards[0]], sourceCard: this });
              }
              MOVE_CARDS(store, state, player.discard, inPlayList, { cards: [fromDiscard[0]], sourceCard: this });
              MOVE_CARDS(store, state, player.hand, player.discard, { cards: [second], sourceCard: this });
            },
          );
        },
      );
    }
    return state;
  }
}
