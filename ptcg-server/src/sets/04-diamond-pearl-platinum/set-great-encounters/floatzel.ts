import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';

import { GameMessage } from '../../../game/game-message';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { WAS_ATTACK_USED, COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';

function* useAquaJet(next: Function, store: StoreLike, state: State,
  effect: AttackEffect): IterableIterator<State> {

  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  // Opponent doesn't have benched pokemon
  const hasBenched = opponent.bench.some(b => b.cards.length > 0);
  if (!hasBenched) {
    return state;
  }

  let flipResult = false;
  yield COIN_FLIP_PROMPT(store, state, player, result => {
    flipResult = result;
    next();
  });

  if (!flipResult) {
    return state;
  }

  return store.prompt(state, new ChoosePokemonPrompt(
    player.id,
    GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
    PlayerType.TOP_PLAYER,
    [SlotType.BENCH],
    { allowCancel: false }
  ), targets => {
    if (!targets || targets.length === 0) {
      return;
    }
    const damageEffect = new PutDamageEffect(effect, 10);
    damageEffect.target = targets[0];
    store.reduceEffect(state, damageEffect);
  });
}

export class Floatzel extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Buizel';
  public cardType: CardType[] = [W];
  public hp: number = 80;
  public weakness = [{
    type: L,
    value: 20
  }];
  public retreat = [C];

  public attacks = [{
    name: 'Agility',
    cost: [C, C],
    damage: 20,
    text: 'Flip a coin. If heads, prevent all effects of an attack, ' +
    'including damage, done to Floatzel during your opponent\'s next turn.'
  }, {
    name: 'Aqua Jet',
    cost: [W, W, C],
    damage: 60,
    text: 'Flip a coin. If heads, this attack does 10 damage to 1 ' +
    'of your opponent\'s Benched Pokemon. (Don\'t apply Weakness ' +
    'and Resistance for Benched Pokemon.)'
  }];

  public set: string = 'GE';
  public name: string = 'Floatzel';
  public fullName: string = 'Floatzel GE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '37';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const generator = useAquaJet(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }

}
