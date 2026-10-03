import { Card } from '../../../game/store/card/card';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { StoreLike, State, Player } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { CardTarget, PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Philippe extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'CRI';
  public regulationMark: string = 'J';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '79';
  public name: string = 'Philippe';
  public fullName: string = 'Philippe M4';
  public text: string =
    'Attach up to 2 Basic [M] Energy cards from your discard pile to 1 of your [M] Pokémon.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    const basicMetalInDiscard = player.discard.cards.filter(
      (c) =>
        c instanceof EnergyCard &&
        c.energyType === EnergyType.BASIC &&
        c.provides.includes(CardType.METAL),
    );
    if (basicMetalInDiscard.length === 0) {
      return false;
    }
    let metalPokemonCount = 0;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      const checkType = new CheckPokemonTypeEffect(cardList);
      store.reduceEffect(state, checkType);
      if (checkType.cardTypes.includes(CardType.METAL)) {
        metalPokemonCount++;
      }
    });
    if (metalPokemonCount === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      const basicMetalInDiscard = player.discard.cards.filter(
        (c) =>
          c instanceof EnergyCard &&
          c.energyType === EnergyType.BASIC &&
          c.provides.includes(CardType.METAL),
      );

      if (basicMetalInDiscard.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked: CardTarget[] = [];
      let metalPokemonCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkType);
        if (!checkType.cardTypes.includes(CardType.METAL)) {
          blocked.push(target);
        } else {
          metalPokemonCount++;
        }
      });

      if (metalPokemonCount === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const discardBlocked: number[] = [];
      player.discard.cards.forEach((card, index) => {
        if (
          !(card instanceof EnergyCard) ||
          card.energyType !== EnergyType.BASIC ||
          !card.provides.includes(CardType.METAL)
        ) {
          discardBlocked.push(index);
        }
      });

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false, blocked },
        ),
        (targets) => {
          if (!targets || targets.length === 0) return state;

          const target = targets[0];
          const checkType = new CheckPokemonTypeEffect(target);
          store.reduceEffect(state, checkType);
          if (!checkType.cardTypes.includes(CardType.METAL)) {
            return state;
          }

          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_ATTACH,
              player.discard,
              { superType: SuperType.ENERGY },
              {
                min: 0,
                max: Math.min(2, basicMetalInDiscard.length),
                allowCancel: false,
                blocked: discardBlocked,
              },
            ),
            (selected: Card[]) => {
              const cards = selected || [];
              cards.forEach((card) => {
                MOVE_CARDS(store, state, player.discard, target, { cards: [card], sourceCard: this });
              });
              return state;
            },
          );
        },
      );
    }
    return state;
  }
}
