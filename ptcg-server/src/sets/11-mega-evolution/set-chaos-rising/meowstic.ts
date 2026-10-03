import { CardType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard, StoreLike, State, StateUtils } from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { AttachEnergyPrompt } from '../../../game/store/prompts/attach-energy-prompt';
import { SuperType } from '../../../game/store/card/card-types';
import { GameMessage } from '../../../game/game-message';
import { PlayerType } from '../../../game/store/actions/play-card-action';
import { SlotType } from '../../../game/store/actions/play-card-action';

export class Meowstic extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Espurr';
  public hp: number = 100;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Tricky Steps',
      cost: [P, C],
      damage: 80,
      text: "You may move an Energy from your opponent's Active Pokémon to 1 of their Benched Pokémon. ",
    },
  ];

  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '37';
  public name: string = 'Meowstic';
  public fullName: string = 'Meowstic M4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasBench = opponent.bench.some((b) => b.cards.length > 0);
      const hasEnergy = opponent.active.cards.some((c) => c.superType === SuperType.ENERGY);
      if (hasBench && hasEnergy) {
        return store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_CARDS,
            opponent.active,
            PlayerType.TOP_PLAYER,
            [SlotType.BENCH],
            { superType: SuperType.ENERGY },
            { allowCancel: true, min: 0, max: 1 },
          ),
          (transfers) => {
            const list = transfers || [];
            for (const t of list) {
              const target = StateUtils.getTarget(state, player, t.to);
              MOVE_CARDS(store, state, opponent.active, target, { cards: [t.card], sourceCard: this });
            }
          },
        );
      }
    }
    return state;
  }
}
