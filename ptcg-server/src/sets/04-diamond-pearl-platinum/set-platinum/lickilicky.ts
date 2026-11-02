import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Lickilicky extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Lickitung';
  public hp: number = 120;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Harrumph',
    cost: [C, C, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 40 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.) Before doing damage, discard all Trainer cards attached to that Pokémon.'
  }, {
    name: 'Body Press',
    cost: [C, C, C, C],
    damage: 60,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed and discard an Energy card attached to the Defending Pokémon.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '33';
  public name: string = 'Lickilicky';
  public fullName: string = 'Lickilicky PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Harrumph
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { allowCancel: false }
      ), selected => {
        const target = selected[0];
        if (target.tools.length > 0) {
          MOVE_CARDS(store, state, target, opponent.discard, { cards: [...target.tools], sourceCard: this });
        }
        target.cards.forEach(card => {
          if (card.superType === SuperType.TRAINER) {
            MOVE_CARDS(store, state, target, opponent.discard, { cards: [card], sourceCard: this });
          }
        });
        if (target === opponent.active) {
          const damageEffect = new DealDamageEffect(effect, 40);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        } else {
          const damageEffect = new PutDamageEffect(effect, 40);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    // Body Press
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
          DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
        }
      });
    }

    return state;
  }
}
