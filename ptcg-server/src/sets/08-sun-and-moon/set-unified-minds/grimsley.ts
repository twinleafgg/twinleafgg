import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { DamageMap, GameError, MoveDamagePrompt, StateUtils } from '../../../game';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Grimsley extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'UNM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '199';

  public name: string = 'Grimsley';

  public fullName: string = 'Grimsley UNM';

  public text: string =
    "Move up to 3 damage counters from 1 of your opponent's Pokémon to another of their Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const damagedPokemon = [
        ...opponent.bench.filter((b) => b.cards.length > 0 && b.damage > 0),
        ...(opponent.active.damage > 0 ? [opponent.active] : []),
      ];

      if (damagedPokemon.length === 0) {
        throw new GameError(GameMessage.CANNOT_MOVE_DAMAGE);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const maxAllowedDamage: DamageMap[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkHpEffect = new CheckHpEffect(player, cardList);
        store.reduceEffect(state, checkHpEffect);
        maxAllowedDamage.push({ target, damage: checkHpEffect.hp });
      });

      return store.prompt(
        state,
        new MoveDamagePrompt(
          effect.player.id,
          GameMessage.MOVE_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          maxAllowedDamage,
          {
            min: 1,
            max: 3,
            allowCancel: false,
            singleSourceTarget: true,
            singleDestinationTarget: true,
          },
        ),
        (transfers) => {
          if (transfers === null) {
            MOVE_CARDS(store, state, player.supporter, player.discard, {
              cards: [this],
              sourceCard: this,
            });
            return state;
          }

          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            source.damage -= 10;
            target.damage += 10;
          }

          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [this],
            sourceCard: this,
          });
          return state;
        },
      );
    }

    return state;
  }
}
