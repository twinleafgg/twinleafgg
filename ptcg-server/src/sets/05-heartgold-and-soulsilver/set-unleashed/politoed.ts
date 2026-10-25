import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { CardTarget, ChoosePokemonPrompt, GameError, GameMessage, PlayerType, PowerType, SlotType, State, StoreLike } from '../../../game';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, MULTIPLE_COIN_FLIPS_PROMPT, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Politoed extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Poliwhirl';
  public hp: number = 120;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public powers = [{
    name: 'Leap Frog',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may choose a Water Pokémon on your Bench and switch it with your Active Pokémon. This power can\'t be used if Politoed is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Big Chorus',
    cost: [W, C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Flip a coin for each Water Pokémon you have in play. This attack does 30 damage times the number of heads.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Politoed';
  public fullName: string = 'Politoed UL';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Leap Frog
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const blocked: CardTarget[] = [];
      let hasWaterBench = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (list === player.active) {
          return;
        }
        const checkType = new CheckPokemonTypeEffect(list);
        store.reduceEffect(state, checkType);
        if (checkType.cardTypes.includes(CardType.WATER)) {
          hasWaterBench = true;
        } else {
          blocked.push(target);
        }
      });
      if (!hasWaterBench) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), targets => {
        if (targets && targets.length > 0) {
          player.switchPokemon(targets[0]);
        }
      });
    }

    // Big Chorus
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let waterCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const checkType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkType);
        if (checkType.cardTypes.includes(CardType.WATER)) {
          waterCount += 1;
        }
      });
      if (waterCount === 0) {
        effect.damage = 0;
        return state;
      }
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, waterCount, results => {
        effect.damage = 30 * results.filter(r => r).length;
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
