import { AttachEnergyPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { DRAW_CARDS_UNTIL_CARDS_IN_HAND, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class LickilickyC extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [C];
  public hp: number = 90;
  public weakness = [{ type: F, value: +30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Licking-Licking Heal',
    cost: [C],
    damage: 0,
    text: 'Attach a Basic Energy card from your hand to 1 of your Pokémon. Then, remove 2 damage counters from that Pokémon.'
  }, {
    name: 'Return',
    cost: [C, C, C],
    damage: 40,
    text: 'Draw cards until you have 6 cards in your hand.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '30';
  public name: string = 'Lickilicky C';
  public fullName: string = 'Lickilicky C SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Licking-Licking Heal
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergyInHand = player.hand.cards.some(c => {
        return c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC;
      });
      if (!hasEnergyInHand) {
        return state;
      }
      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.hand,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { allowCancel: false, min: 1, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        if (transfers.length === 0) {
          return;
        }
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
          store.reduceEffect(state, new HealEffect(player, target, 20));
        }
      });
    }

    // Return
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DRAW_CARDS_UNTIL_CARDS_IN_HAND(effect.player, 6);
    }

    return state;
  }
}
