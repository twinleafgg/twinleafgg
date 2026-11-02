import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, EnergyCard, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Leafeon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Eevee';
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Energy Refresh',
    powerType: PowerType.POKEBODY,
    text: 'As long as Leafeon is your Active Pokémon, whenever you attach an Energy card from your hand to 1 of your Pokémon, remove 2 damage counters from that Pokémon.'
  }];

  public attacks = [{
    name: 'Plus Energy',
    cost: [G, C],
    damage: 40,
    text: 'Attach a basic Energy card from your hand to 1 of your Pokémon.'
  }, {
    name: 'Soothing Scent',
    cost: [G, C, C],
    damage: 60,
    text: 'The Defending Pokémon is now Asleep.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '45';
  public name: string = 'Leafeon';
  public fullName: string = 'Leafeon RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Refresh
    if (effect instanceof AttachEnergyEffect) {
      const player = effect.player;
      if (player.active.getPokemonCard() !== this) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      store.reduceEffect(state, new HealEffect(player, effect.target, 20));
    }

    // Plus Energy
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergyInHand = player.hand.cards.some(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC);
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
        { allowCancel: true, min: 0, max: 1 },
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          const energyCard = transfer.card as EnergyCard;
          store.reduceEffect(state, new AttachEnergyEffect(player, energyCard, target));
        }
      });
    }

    // Soothing Scent
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
    }

    return state;
  }
}
