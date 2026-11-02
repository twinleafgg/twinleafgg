import { PokemonCard, Stage, CardTag, CardType, PowerType, StoreLike, State, GameError, GameMessage, ConfirmPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterAttackEffect } from '../../../game/store/effects/game-phase-effects';
import { COPY_ATTACK_VIA_ABILITY } from '../../../game/store/prefabs/copy-attack-prefabs';
import { WAS_POWER_USED, IS_ABILITY_BLOCKED, SWITCH_ACTIVE_WITH_BENCHED } from '../../../game/store/prefabs/prefabs';

export class Mewex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public hp: number = 160;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [];

  public powers = [{
    name: 'Memory Helix',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'This Pokémon can use the attacks of any of your Benched Pokémon. (You still need the necessary Energy to use each attack.)',
  }];

  public attacks = [{
    name: 'Teleportation Burst',
    cost: [P],
    damage: 30,
    text: 'You may switch this Pokémon with 1 of your Benched Pokémon.',
  }];

  public regulationMark: string = 'J';
  public set: string = '30C';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '66';
  public name: string = 'Mew ex';
  public fullName: string = 'Mew ex 30C';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Memory Helix
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      return COPY_ATTACK_VIA_ABILITY(store, state, effect, {
        copycatCard: this,
        filter: (cardList) => cardList !== player.active,
      });
    }

    // Teleportation Burst
    if (effect instanceof AfterAttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;
      if (player.bench.some((b) => b.cards.length > 0)) {
        store.prompt(
          state,
          new ConfirmPrompt(player.id, GameMessage.WANT_TO_SWITCH_POKEMON),
          (wantToSwitch) => {
            if (wantToSwitch) {
              SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
            }
          },
        );
      }
    }
    return state;
  }
}
