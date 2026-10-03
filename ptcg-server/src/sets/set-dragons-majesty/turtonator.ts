import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../game/store/card/card-types';
import { StoreLike, State, PlayerType, SlotType, StateUtils, EnergyCard } from '../../game';

import { Effect } from '../../game/store/effects/effect';
import { GameMessage } from '../../game/game-message';
import { DiscardEnergyPrompt } from '../../game/store/prompts/discard-energy-prompt';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Turtonator extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 110;
  public weakness = [{ type: Y }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Explosive Jet',
      cost: [R, R, R],
      damage: 50,
      damageCalculation: 'x',
      text: 'Discard any amount of [R] Energy from your Pokémon. This attack does 50 damage for each card you discarded in this way.'
    }
  ];

  public set: string = 'DRM';
  public setNumber: string = '50';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Turtonator';
  public fullName: string = 'Turtonator DRM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let totalFireEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const fireCount = cardList.cards.filter(card =>
          card instanceof EnergyCard && card.name === 'Fire Energy'
        ).length;
        totalFireEnergy += fireCount;
      });

      return store.prompt(state, new DiscardEnergyPrompt(
        player.id,
        GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { min: 1, max: totalFireEnergy, allowCancel: false }
      ), transfers => {
        if (transfers === null) {
          return state;
        }

        // Move all selected energies to discard
        transfers.forEach(transfer => {
          const source = StateUtils.getTarget(state, player, transfer.from);
          MOVE_CARDS(store, state, source, player.discard, { cards: [transfer.card], sourceCard: this });
        });

        // Set damage based on number of discarded cards
        effect.damage = transfers.length * 50;
        return state;
      });
    }
    return state;
  }
}