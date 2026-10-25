import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, EnergyCard, GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Numel extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    name: 'Flare Bonus',
    cost: [C],
    damage: 0,
    text: 'Discard a Fire Energy card from your hand. Then, draw 3 cards.'
  },
  {
    name: 'Combustion',
    cost: [R, R, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '35';
  public name: string = 'Numel';
  public fullName: string = 'Numel UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flare Bonus
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasFire = player.hand.cards.some(c =>
        c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Fire Energy'
      );
      if (!hasFire) {
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards: Card[] = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
          DRAW_CARDS(store, state, player, 3);
        }
      });
    }

    return state;
  }
}
