import { PokemonCard, CardType, Stage, CardTarget, ChoosePokemonPrompt, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../game';
import { DealDamageEffect, PutDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../game/store/prefabs/attack-effects';
import { DRAW_CARDS, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Plusle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -30 }];
  public retreat = [C];

  public attacks = [{
    // Cheer Up
    name: 'Cheer Up',
    cost: [C],
    damage: 0,
    text: 'Draw a card. If you have Minun in play, draw 2 cards instead.'
  }, {
    // Positive Ion
    name: 'Positive Ion',
    cost: [L, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 damage plus 10 more damage.'
  }, {
    // Body Bolt
    name: 'Body Bolt',
    cost: [L, L],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon that has any Poké-Bodies. This attack does 30 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Plusle';
  public fullName: string = 'Plusle P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cheer Up
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let hasMinun = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
        if (card.name === 'Minun') {
          hasMinun = true;
        }
      });
      DRAW_CARDS(store, state, player, hasMinun ? 2 : 1);
    }
    // Positive Ion
    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 10);
    }
    // Body Bolt
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const blocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (_list, card, target) => {
        if (!card.powers.some(power => power.powerType === PowerType.POKEBODY)) {
          blocked.push(target);
        }
      });
      const hasTarget = opponent.getPokemonInPlay().some(list => {
        const card = list.getPokemonCard();
        return !!card && card.powers.some(power => power.powerType === PowerType.POKEBODY);
      });
      if (!hasTarget) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        const target = selected[0];
        if (target === opponent.active) {
          const damageEffect = new DealDamageEffect(effect, 30);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        } else {
          const damageEffect = new PutDamageEffect(effect, 30);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }
    return state;
  }
}
