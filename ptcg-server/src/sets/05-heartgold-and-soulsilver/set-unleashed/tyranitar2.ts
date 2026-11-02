import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, State, StateUtils, StoreLike } from '../../../game';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS } from '../../../game/store/prefabs/attack-effects';
import { DISCARD_TOP_X_CARDS_FROM_YOUR_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Tyranitar2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Pupitar';
  public hp: number = 160;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Darkness Howl',
    cost: [D],
    damage: 0,
    text: 'This attack does 20 damage to each Pokémon in play (both yours and your opponent\'s) (excluding any Darkness Pokémon). (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Power Claw',
    cost: [D, C, C],
    damage: 60,
    text: 'This attack\'s damage isn\'t affected by Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.'
  },
  {
    name: 'Megaton Tail',
    cost: [D, D, C, C],
    damage: 120,
    text: 'Discard the top 3 cards of your deck.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '88';
  public name: string = 'Tyranitar';
  public fullName: string = 'Tyranitar UL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Darkness Howl
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const damageIfNotDarkness = (cardList: typeof player.active, applyWeakness: boolean) => {
        if (cardList.cards.length === 0) {
          return;
        }
        const checkType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkType);
        if (checkType.cardTypes.includes(CardType.DARK)) {
          return;
        }
        if (applyWeakness) {
          const damageEffect = new DealDamageEffect(effect, 20);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        } else {
          const damageEffect = new PutDamageEffect(effect, 20);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        }
      };

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        damageIfNotDarkness(cardList, false);
      });
      damageIfNotDarkness(opponent.active, true);
      opponent.bench.forEach(cardList => damageIfNotDarkness(cardList, false));
    }

    // Power Claw
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS(store, state, effect, 60);
    }

    // Megaton Tail
    if (WAS_ATTACK_USED(effect, 2, this)) {
      DISCARD_TOP_X_CARDS_FROM_YOUR_DECK(store, state, effect.player, 3, this, effect);
    }

    return state;
  }
}
