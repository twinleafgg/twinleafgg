import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { EnergyCard, GameMessage, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';

export class Zweilous2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Deino';
  public cardType: CardType[] = [N];
  public hp: number = 90;
  public weakness = [{ type: N }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Draw In',
      cost: [C],
      damage: 0,
      text: 'Attach 2 [D] Energy cards from your discard pile to this Pokémon.'
    },
    {
      name: 'Dragon Headbutt',
      cost: [P, D, C],
      damage: 40,
      text: ''
    }
  ];

  public set: string = 'DRX';
  public setNumber: string = '96';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Zweilous';
  public fullName: string = 'Zweilous DRX 96';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Draw In - attach 2 Dark Energy from discard to this Pokemon
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const darkEnergyInDiscard = player.discard.cards.filter(c =>
        c.superType === SuperType.ENERGY
        && (c as EnergyCard).energyType === EnergyType.BASIC
        && (c as EnergyCard).provides.includes(CardType.DARK)
      );

      if (darkEnergyInDiscard.length === 0) {
        return state;
      }

      const count = Math.min(2, darkEnergyInDiscard.length);

      const blocked: number[] = [];
      player.discard.cards.forEach((card, index) => {
        if (!(card instanceof EnergyCard)
          || card.energyType !== EnergyType.BASIC
          || !card.provides.includes(CardType.DARK)) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.discard,
        { superType: SuperType.ENERGY },
        { min: count, max: count, allowCancel: false, blocked }
      ), selected => {
        const cards = selected || [];
        cards.forEach(card => {
          MOVE_CARDS(store, state, player.discard, player.active, { cards: [card], sourceCard: this });
        });
      });
    }

    return state;
  }
}
