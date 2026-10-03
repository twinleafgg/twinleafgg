import {
  CardTag,
  CardTarget,
  CardType,
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {
  UseStadiumEffect,
  HealEffect,
  MoveCardsEffect,
} from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class LifeForestPrismStar extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.PRISM_STAR];
  public set: string = 'LOT';
  public setNumber: string = '180';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Life Forest Prism Star';
  public fullName: string = 'Life Forest \u25c7 LOT';
  public text: string =
    "Once during each player's turn, that player may heal 60 damage and remove all Special Conditions from 1 of their [G] Pokémon.\n\nWhenever any player plays an Item or Supporter card from their hand, prevent all effects of that card done to this Stadium card.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const blocked: CardTarget[] = [];
      let hasGrassPokemon = false;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, cardTarget) => {
        const checkPokemonType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkPokemonType);

        if (
          !checkPokemonType.cardTypes.includes(CardType.GRASS) ||
          IS_STADIUM_EFFECT_BLOCKED(store, state, player, cardList, this)
        ) {
          blocked.push(cardTarget);
          return;
        }

        hasGrassPokemon = true;
      });

      if (!hasGrassPokemon) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false, blocked },
        ),
        (selected) => {
          const target = selected?.[0];
          if (!target || IS_STADIUM_EFFECT_BLOCKED(store, state, player, target, this)) {
            return state;
          }

          store.reduceEffect(state, new HealEffect(player, target, 60));
          target.clearAllSpecialConditions();
          return state;
        },
      );
    }

    if (effect instanceof MoveCardsEffect && StateUtils.getStadiumCard(state) === this) {
      if (
        effect.sourceCard instanceof TrainerCard &&
        (effect.sourceCard.trainerType === TrainerType.SUPPORTER ||
          effect.sourceCard.trainerType === TrainerType.ITEM)
      ) {
        const stadiumCard = StateUtils.getStadiumCard(state);
        if (stadiumCard !== undefined) {
          const cardList = StateUtils.findCardList(state, stadiumCard);
          if (effect.source === cardList) {
            effect.preventDefault = true;
          }
        }
      }
    }

    return state;
  }
}
