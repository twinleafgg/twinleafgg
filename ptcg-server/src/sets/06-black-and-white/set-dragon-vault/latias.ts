import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, EnergyCard, AttachEnergyPrompt, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class Latias extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 100;
  public weakness = [{ type: N }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Energy Assist',
      cost: [C],
      damage: 0,
      text: 'Attach a basic Energy card from your discard pile to 1 of your Benched Pok\u00e9mon.'
    },
    {
      name: 'Sky Heal',
      cost: [R, P],
      damage: 40,
      text: 'If Latios is on your Bench, heal 20 damage from this Pok\u00e9mon.'
    }
  ];

  public set: string = 'DRV';
  public setNumber: string = '9';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Latias';
  public fullName: string = 'Latias DRV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Assist
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some(c =>
        c.superType === SuperType.ENERGY && (c as EnergyCard).energyType === EnergyType.BASIC
      );
      const hasBenched = player.bench.some(b => b.cards.length > 0);

      if (!hasEnergyInDiscard || !hasBenched) {
        return state;
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { allowCancel: false, min: 0, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    // Sky Heal
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      let hasLatios = false;
      player.bench.forEach(benchSlot => {
        if (benchSlot.cards.length > 0) {
          const pokemon = benchSlot.getPokemonCard();
          if (pokemon && pokemon.name === 'Latios') {
            hasLatios = true;
          }
        }
      });

      if (hasLatios) {
        HEAL_X_DAMAGE_FROM_THIS_POKEMON(20, effect, store, state);
      }
    }

    return state;
  }
}
