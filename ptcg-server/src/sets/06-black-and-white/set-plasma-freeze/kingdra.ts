import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, EnergyCard, ChoosePokemonPrompt, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Kingdra extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Seadra';
  public cardType: CardType[] = [N];
  public hp: number = 140;
  public weakness = [{ type: N }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Dragon Vortex',
      cost: [C],
      damage: 20,
      damageCalculation: 'x',
      text: 'Does 20 damage times the number of [W] Energy cards and [L] Energy cards in your discard pile. Then, shuffle all of those cards back into your deck.'
    },
    {
      name: 'Tri Bullet',
      cost: [W],
      damage: 0,
      text: 'This attack does 30 damage to 3 of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
    }
  ];

  public set: string = 'PLF';
  public setNumber: string = '84';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Kingdra';
  public fullName: string = 'Kingdra PLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Dragon Vortex
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Count [W] and [L] basic energy cards in discard
      const matchingEnergy = player.discard.cards.filter(c =>
        c.superType === SuperType.ENERGY &&
        (c as EnergyCard).energyType === EnergyType.BASIC &&
        ((c as EnergyCard).provides.includes(CardType.WATER) || (c as EnergyCard).provides.includes(CardType.LIGHTNING))
      );

      effect.damage = 20 * matchingEnergy.length;

      // Shuffle all of those cards back into deck
      if (matchingEnergy.length > 0) {
        matchingEnergy.forEach(card => {
          MOVE_CARDS(store, state, player.discard, player.deck, { cards: [card], sourceCard: this });
        });
        SHUFFLE_DECK(store, state, player);
      }
    }

    // Attack 2: Tri Bullet
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Count available targets (active + bench with cards)
      let totalTargets = 1; // Active always counts
      opponent.bench.forEach(b => { if (b.cards.length > 0) totalTargets++; });

      const maxTargets = Math.min(3, totalTargets);

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: maxTargets, max: maxTargets, allowCancel: false }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }
        targets.forEach(target => {
          // For active: use DealDamageEffect (applies W/R)
          // For bench: use PutDamageEffect (no W/R)
          if (target === opponent.active) {
            const dealDamage = new DealDamageEffect(effect, 30);
            dealDamage.target = target;
            store.reduceEffect(state, dealDamage);
          } else {
            const putDamage = new PutDamageEffect(effect, 30);
            putDamage.target = target;
            store.reduceEffect(state, putDamage);
          }
        });
      });
    }

    return state;
  }
}
