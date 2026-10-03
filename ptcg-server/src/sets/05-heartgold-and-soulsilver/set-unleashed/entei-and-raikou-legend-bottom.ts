import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, CardTag } from '../../../game/store/card/card-types';
import {
  GameError,
  GameMessage,
  PokemonCardList,
  PowerType,
  State,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EnteiAndRaikouLegendTop } from './entei-and-raikou-legend-top';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class EnteiAndRaikouLegendBottom extends PokemonCard {
  public stage: Stage = Stage.LEGEND;
  protected _tags = [CardTag.LEGEND, CardTag.DUAL_LEGEND];
  public cardType: CardType[] = [R, L];
  public hp: number = 140;
  public weakness = [{ type: W }, { type: F }];
  public retreat = [];

  public powers = [
    {
      name: 'Legend Assembly',
      text: 'Put this card from your hand onto your Bench only with the other half of Entei & Raikou LEGEND.',
      exemptFromAbilityLock: true,
      useFromHand: true,
      powerType: PowerType.LEGEND_ASSEMBLY,
    },
  ];

  public attacks = [
    {
      name: 'Detonation Spin',
      cost: [R, C],
      damage: 90,
      text: 'Discard a [R] Energy attached to Entei & Raikou LEGEND.',
    },
    {
      name: 'Thunder Fall',
      cost: [L, C],
      damage: 0,
      text: "Discard all Energy attached to Entei & Raikou LEGEND. This attack does 80 damage to each Pokémon that has any Poké-Powers (both yours and your opponent's). This attack's damage isn't affected by Weakness or Resistance.",
    },
  ];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '91';
  public name: string = 'Entei & Raikou LEGEND';
  public fullName: string = 'Entei & Raikou LEGEND (Bottom) UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // assemblin the avengers
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let topPiece = false;
      let bottomPiece = false;
      let topCard: EnteiAndRaikouLegendTop | null = null;
      let bottomCard: EnteiAndRaikouLegendBottom | null = null;

      player.hand.cards.forEach((card) => {
        if (card instanceof EnteiAndRaikouLegendTop && !topPiece) {
          topPiece = true;
          topCard = card;
        }
        if (card instanceof EnteiAndRaikouLegendBottom && !bottomPiece) {
          bottomPiece = true;
          bottomCard = card;
        }
      });

      if (topPiece && bottomPiece && topCard && bottomCard) {
        if (slots.length > 0) {
          MOVE_CARDS(store, state, player.hand, slots[0], { cards: [bottomCard], sourceCard: this });
          MOVE_CARDS(store, state, player.hand, slots[0], { cards: [topCard], sourceCard: this });
          slots[0].pokemonPlayedTurn = state.turn;
        }
      } else {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
    }

    return state;
  }
}
