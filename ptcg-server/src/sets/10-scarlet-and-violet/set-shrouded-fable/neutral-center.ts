import { GameError, GameMessage, StateUtils } from '../../../game';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { GamePhase, State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { MoveCardsEffect, UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class NeutralCenter extends TrainerCard {
  protected _trainerType = TrainerType.STADIUM;
  protected _tags = [CardTag.ACE_SPEC];
  public set = 'SFA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '60';
  public regulationMark = 'H';
  public name = 'Neutralization Zone';
  public fullName = 'Neutralization Zone SFA';
  public text =
    "Prevent all damage done to Pokémon that don't have a Rule Box (both yours and your opponent's) by attacks from the opponent's Pokémon ex and Pokémon V. (Pokémon ex, Pokémon V, etc. have Rule Boxes.)\n\nThis card can't be put into your hand or deck from the discard pile.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof PutDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      const attackerOwner = StateUtils.findOwner(state, effect.source);

      if (
        owner === attackerOwner ||
        state.phase !== GamePhase.ATTACK ||
        IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)
      ) {
        return state;
      }

      if (effect.source.hasRuleBox() && !effect.target.hasRuleBox()) {
        effect.preventDefault = true;
      }
    }

    if (effect instanceof MoveCardsEffect) {
      for (const player of state.players) {
        if (effect.source !== player.discard || !player.discard.cards.includes(this)) {
          continue;
        }
        if (effect.destination !== player.hand && effect.destination !== player.deck) {
          continue;
        }

        if (effect.cards) {
          if (!effect.cards.includes(this)) {
            continue;
          }
          effect.cards = effect.cards.filter((c) => c !== this);
          if (effect.cards.length === 0) {
            effect.preventDefault = true;
          }
        } else if (effect.count !== undefined) {
          effect.cards = player.discard.cards.filter((c) => c !== this).slice(0, effect.count);
          effect.count = undefined;
          if (effect.cards.length === 0) {
            effect.preventDefault = true;
          }
        } else {
          effect.cards = player.discard.cards.filter((c) => c !== this);
          if (effect.cards.length === 0) {
            effect.preventDefault = true;
          }
        }
      }
    }

    return state;
  }
}
