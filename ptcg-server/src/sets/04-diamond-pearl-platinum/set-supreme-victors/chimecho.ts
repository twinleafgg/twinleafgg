import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Chimecho extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Heal Bell',
    cost: [C],
    damage: 0,
    text: 'Remove 3 damage counters from each of your Pokémon.'
  }, {
    name: 'Super Psywave',
    cost: [P],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. Count the amount of Energy attached to that Pokémon. Put that many damage counters on the Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '21';
  public name: string = 'Chimecho';
  public fullName: string = 'Chimecho SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Heal Bell
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        store.reduceEffect(state, new HealEffect(player, cardList, 30));
      });
    }

    // Super Psywave
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }
        const target = targets[0];
        const checkEnergy = new CheckProvidedEnergyEffect(opponent, target);
        store.reduceEffect(state, checkEnergy);
        const counters = checkEnergy.energyMap.length;
        if (counters > 0) {
          const damageEffect = new PutCountersEffect(effect, 10 * counters);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
