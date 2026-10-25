import { CardTag, CardType, ChooseCardsPrompt, EnergyType, GameMessage, PokemonCard, Stage, State, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, MULTIPLE_COIN_FLIPS_PROMPT, SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class RapidashE4 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [];

  public attacks = [{
    name: 'Pickup Power',
    cost: [],
    damage: 0,
    text: 'Flip 3 coins. For each heads, search your discard pile for a basic Energy card, show it to your opponent, and put it into your hand.'
  },
  {
    name: 'Fire Mane',
    cost: [R],
    damage: 20,
    text: ''
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '47';
  public name: string = 'Rapidash E4';
  public fullName: string = 'Rapidash E4 RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Pickup Power
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, results => {
        const heads = results.filter(r => r).length;
        if (heads === 0) {
          return;
        }
        const available = player.discard.cards.filter(c => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC).length;
        const max = Math.min(heads, available);
        if (max === 0) {
          return;
        }
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max, allowCancel: true }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.discard, player.hand, { cards });
            SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          }
        });
      });
    }

    return state;
  }
}
