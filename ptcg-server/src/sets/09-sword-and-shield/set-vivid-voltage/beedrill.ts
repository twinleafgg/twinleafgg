import { CardType, GameError, GameMessage, Player, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {PLAY_POKEMON_FROM_HAND_TO_BENCH, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Beedrill extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom: string = 'Kakuna';

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 130;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [];

  public set = 'VIV';

  public setNumber = '3';

  public cardImage = 'assets/cardback.png';

  public name = 'Beedrill';

  public fullName = 'Beedrill VIV';

  public regulationMark: string = 'D';

  public powers = [
    {
      name: 'Elusive Master',
      powerType: PowerType.ABILITY,
      useFromHand: true,
      useFromHandToBench: true,
      text: 'Once during your turn, if this Pokemon is the last card in your hand, you may play it onto your Bench. If you do, draw 3 cards.'
    }
  ];

  public attacks = [{ name: 'Sharp Sting', cost: [CardType.GRASS, CardType.COLORLESS], damage: 120, text: '' }];

  public canUseFromHandToBench(_store: StoreLike, _state: State, player: Player): boolean {
    return player.hand.cards.filter(c => c !== this).length === 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Elusive Master
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (!this.canUseFromHandToBench(store, state, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      PLAY_POKEMON_FROM_HAND_TO_BENCH(state, player, this, effect.target);
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
    }

    return state;
  }
}