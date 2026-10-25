import { CardTarget, CardType, ChoosePokemonPrompt, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { FLIP_COIN_FOR_FLY } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Tropius extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Fly',
    cost: [C],
    damage: 30,
    text: 'Flip a coin. If tails, this attack does nothing. If heads, prevent all effects of an attack, including damage, done to Tropius during your opponent\'s next turn.'
  },
  {
    name: 'Blessed Fruit',
    cost: [G, G],
    damage: 0,
    text: 'Remove all damage counters from 1 of your Benched Grass Pokémon.'
  },
  {
    name: 'Solarbeam',
    cost: [G, C, C, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '52';
  public name: string = 'Tropius';
  public fullName: string = 'Tropius RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fly
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_COIN_FOR_FLY(store, state, effect, this);
    }

    // Blessed Fruit
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const blocked: CardTarget[] = [];
      let hasBenchedGrass = false;
      player.bench.forEach((b, index) => {
        const pokemon = b.getPokemonCard();
        if (!pokemon || !pokemon.cardType.includes(CardType.GRASS)) {
          blocked.push({ player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index });
        } else {
          hasBenchedGrass = true;
        }
      });
      if (!hasBenchedGrass) {
        return state;
      }

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_HEAL,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { allowCancel: false, min: 1, max: 1, blocked }
      ), targets => {
        if (targets && targets.length > 0) {
          store.reduceEffect(state, new HealEffect(player, targets[0], targets[0].damage));
        }
      });
    }

    return state;
  }
}
