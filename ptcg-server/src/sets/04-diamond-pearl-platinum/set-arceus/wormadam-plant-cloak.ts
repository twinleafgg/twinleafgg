import { CardTarget, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class WormadamPlantCloak extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Burmy Plant Cloak';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Magical Needle',
    cost: [G],
    damage: 20,
    text: 'Remove 2 damage counters from 1 of your Benched Pokémon.'
  }, {
    name: 'Cloak Scale',
    cost: [G, C, C],
    damage: 50,
    text: 'If you have Wormadam Sandy Cloak in play, the Defending Pokémon is now Burned, Confused, and Poisoned.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '49';
  public name: string = 'Wormadam Plant Cloak';
  public fullName: string = 'Wormadam Plant Cloak AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Magical Needle
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const blocked: CardTarget[] = [];
      let hasDamagedBench = false;
      player.bench.forEach((b, index) => {
        if (b.cards.length === 0 || b.damage === 0) {
          blocked.push({ player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index });
        } else {
          hasDamagedBench = true;
        }
      });
      if (!hasDamagedBench) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_HEAL,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        const target = selected[0];
        store.reduceEffect(state, new HealEffect(player, target, 20));
      });
    }

    // Cloak Scale
    if (WAS_ATTACK_USED(effect, 1, this)) {
      let hasSandy = false;
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (card.name === 'Wormadam Sandy Cloak') {
          hasSandy = true;
        }
      });
      if (hasSandy) {
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
      }
    }

    return state;
  }
}
