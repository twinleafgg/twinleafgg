import { PokemonCard, CardType, Stage, CardTarget, ChoosePokemonPrompt, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../game';
import { DealDamageEffect, PutDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { DEFENDING_POKEMON_DOES_LESS_DAMAGE } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { DRAW_CARDS, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Minun extends PokemonCard {
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
    text: 'Draw a card. If you have Plusle in play, draw 2 cards instead.'
  }, {
    // Negative Ion
    name: 'Negative Ion',
    cost: [L, C],
    damage: 20,
    text: 'During your opponent\'s next turn, any damage done by attacks from the Defending Pokémon is reduced by 10 (before applying Weakness and Resistance).'
  }, {
    // Power Bolt
    name: 'Power Bolt',
    cost: [L, L],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon that has any Poké-Powers. This attack does 30 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Minun';
  public fullName: string = 'Minun P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cheer Up
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let hasPlusle = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
        if (card.name === 'Plusle') {
          hasPlusle = true;
        }
      });
      DRAW_CARDS(store, state, player, hasPlusle ? 2 : 1);
    }
    // Negative Ion
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DEFENDING_POKEMON_DOES_LESS_DAMAGE(store, state, effect, this, 10);
    }
    // Power Bolt
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const blocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (_list, card, target) => {
        if (!card.powers.some(power => power.powerType === PowerType.POKEPOWER)) {
          blocked.push(target);
        }
      });
      const hasTarget = opponent.getPokemonInPlay().some(list => {
        const card = list.getPokemonCard();
        return !!card && card.powers.some(power => power.powerType === PowerType.POKEPOWER);
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
