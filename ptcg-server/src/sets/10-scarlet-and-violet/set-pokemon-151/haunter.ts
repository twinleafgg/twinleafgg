import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, ConfirmPrompt, GameMessage, StateUtils, TrainerCard, TrainerType, ChooseCardsPrompt, SuperType } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { EvolveEffect } from "../../../game/store/effects/game-effects";
import { IS_ABILITY_BLOCKED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class Haunter extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Gastly';
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Spirit Return',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may put a Supporter card from your opponent\'s discard pile into their hand.',
  }];

  public attacks = [{
    name: 'Mumble',
    cost: [P, C],
    damage: 30,
    text: ''
  }];

  public regulationMark = 'G';
  public set: string = 'MEW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';
  public name: string = 'Haunter';
  public fullName: string = 'Haunter MEW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if ((effect instanceof EvolveEffect) && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasValidCard = opponent.discard.cards.some(c => {
        return c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER;
      });

      if (!hasValidCard) {
        return state;
      }
      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {

          const blocked: number[] = [];
          opponent.discard.cards.forEach((c, index) => {
            if (c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER) {
              return;
            } else {
              blocked.push(index);
            }
          });

          return store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            opponent.discard,
            { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
            { min: 1, max: 1, allowCancel: false, blocked }
          ), selected => {
            MOVE_CARDS(store, state, opponent.discard, opponent.hand, { cards: selected, sourceCard: this, sourceEffect: this.powers[0] });
            return state;
          });
        }
      });
    }
    return state;
  }
}