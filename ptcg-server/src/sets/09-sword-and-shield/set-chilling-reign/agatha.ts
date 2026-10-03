import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game/store/state-utils';
import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { MoveDamagePrompt, DamageMap } from '../../../game/store/prompts/move-damage-prompt';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard, TrainerType } from '../../../game';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
    const checkHpEffect = new CheckHpEffect(player, cardList);
    store.reduceEffect(state, checkHpEffect);

    const maxAllowedDamage: DamageMap[] = [];
    opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
      maxAllowedDamage.push({ target, damage: checkHpEffect.hp });
    });

    // We will discard this card after prompt confirmation
    effect.preventDefault = true;

    return store.prompt(
      state,
      new MoveDamagePrompt(
        effect.player.id,
        GameMessage.MOVE_DAMAGE,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE],
        maxAllowedDamage,
        { min: 1, max: 3, allowCancel: false },
      ),
      (transfers) => {
        if (transfers === null) {
          return;
        }

        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          if (source.damage >= 20) {
            source.damage -= 20;
            target.damage += 20;
          }
        }
      },
    );
  });
}

export class Agatha extends TrainerCard {
  public regulationMark = 'E';

  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'CRE';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '129';

  public name: string = 'Agatha';

  public fullName: string = 'Agatha CRE';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
