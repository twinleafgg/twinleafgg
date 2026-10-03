import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';

export class Landorus extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 110;
  public weakness = [{ type: W }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Abundant Harvest',
      cost: [F],
      damage: 0,
      text: 'Attach a [F] Energy card from your discard pile to this Pokémon.'
    },
    {
      name: 'Gaia Hammer',
      cost: [F, F, C],
      damage: 80,
      text: 'Does 10 damage to each Benched Pokémon (both yours and your opponent\'s). (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
    }
  ];

  public set: string = 'NVI';
  public setNumber: string = '74';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Landorus';
  public fullName: string = 'Landorus NVI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Abundant Harvest - attach Fighting Energy from discard
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const fightingEnergy = player.discard.cards.filter(c =>
        c.superType === SuperType.ENERGY &&
        c.energyType === EnergyType.BASIC &&
        c.name === 'Fighting Energy'
      );

      if (fightingEnergy.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.discard,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
        { min: 0, max: 1, allowCancel: true }
      ), selected => {
        if (selected && selected.length > 0) {
          MOVE_CARDS(store, state, player.discard, player.active, { cards: [selected[0]], sourceCard: this });
        }
      });
    }

    // Gaia Hammer - 80 damage + 10 to all benched (both sides)
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Damage opponent's bench
      opponent.bench.forEach(benchSlot => {
        if (benchSlot.cards.length > 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = benchSlot;
          store.reduceEffect(state, damageEffect);
        }
      });

      // Damage player's own bench
      player.bench.forEach(benchSlot => {
        if (benchSlot.cards.length > 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = benchSlot;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
