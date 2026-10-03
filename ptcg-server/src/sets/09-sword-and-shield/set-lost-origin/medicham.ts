import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, PlayerType, SlotType, ShuffleDeckPrompt, AttachEnergyPrompt, StateUtils, EnergyCard } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Medicham extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Meditite';

  public cardType: CardType[] = [CardType.FIGHTING];

  public hp: number = 110;

  public weakness = [{ type: CardType.PSYCHIC }];

  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Battle Step',
      cost: [CardType.FIGHTING],
      damage: 50,
      text: 'Search your deck for up to 2 [F] Energy cards and attach them to your Benched Pokémon in any way you like. Then, shuffle your deck.'
    }
  ];

  public set: string = 'LOR';

  public setNumber = '100';

  public cardImage = 'assets/cardback.png';

  public name: string = 'Medicham';

  public fullName: string = 'Medicham LOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.deck,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
        { allowCancel: false, min: 0, max: 2 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          const energyCard = transfer.card as EnergyCard;
          MOVE_CARDS(store, state, player.deck, target, { cards: [energyCard], sourceCard: this });
        }
      });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
        player.deck.applyOrder(order);
      });
    }

    return state;
  }

}