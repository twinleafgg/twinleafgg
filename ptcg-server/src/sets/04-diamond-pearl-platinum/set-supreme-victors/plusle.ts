import { AttachEnergyPrompt, CardType, EnergyCard, EnergyType, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS_UNTIL_CARDS_IN_HAND, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Plusle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Greedy Draw',
    cost: [],
    damage: 0,
    text: 'If you have the same number of cards or less in your hand as your opponent, draw cards until you have 1 more card than your opponent. (If you have more cards in your hand than your opponent, this attack does nothing.)'
  }, {
    name: 'Hand Charge',
    cost: [L],
    damage: 10,
    text: 'Attach a Lightning Energy card from your hand to 1 of your Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';
  public name: string = 'Plusle';
  public fullName: string = 'Plusle SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Greedy Draw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (player.hand.cards.length <= opponent.hand.cards.length) {
        DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, opponent.hand.cards.length + 1);
      }
    }

    // Hand Charge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const hasLightning = player.hand.cards.some(c =>
        c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Lightning Energy'
      );
      if (!hasLightning) {
        return state;
      }
      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.hand,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
        { allowCancel: false, min: 1, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}
