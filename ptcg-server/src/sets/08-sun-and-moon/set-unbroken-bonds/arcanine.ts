import { AttachEnergyPrompt, EnergyCard, GameMessage, PlayerType, SlotType, StateUtils } from '../../../game';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Arcanine extends PokemonCard {

  public stage = Stage.STAGE_1;

  public evolvesFrom = 'Growlithe';

  public cardType: CardType[] = [CardType.FIRE];

  public hp = 140;

  public weakness = [{ type: CardType.WATER }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Grand Flame',
      cost: [CardType.FIRE, CardType.FIRE, CardType.FIRE],
      damage: 120,
      text: 'Attach 2 [R] Energy cards from your discard pile to 1 of your Benched Pokémon.'
    },
    {
      name: 'Heat Tackle',
      cost: [CardType.FIRE, CardType.FIRE, CardType.FIRE, CardType.FIRE],
      damage: 190,
      text: 'This Pokémon does 50 damage to itself.'
    }
  ];

  public set: string = 'UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';
  public name: string = 'Arcanine';
  public fullName: string = 'Arcanine UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {

      const player = effect.player;

      const energyInDiscardPile = player.discard.cards.filter(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Fire Energy');

      if (energyInDiscardPile.length === 0) {
        return state;
      }

      const min = Math.min(2, energyInDiscardPile.length);
      const max = Math.min(2, energyInDiscardPile.length);

      state = store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { allowCancel: false, min, max, sameTarget: true },
      ), transfers => {
        transfers = transfers || [];
        // cancelled by user
        if (transfers.length === 0) {
          return state;
        }
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });

      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const damageEffect = new PutDamageEffect(effect, 50);
      damageEffect.target = player.active;
      store.reduceEffect(state, damageEffect);
    }

    return state;
  }
}

