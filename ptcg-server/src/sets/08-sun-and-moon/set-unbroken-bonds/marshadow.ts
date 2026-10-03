import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, StateUtils, GameError, PokemonCardList } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { DEAL_MORE_DAMAGE_IF_OPPONENT_ACTIVE_HAS_CARD_TAG, MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Marshadow extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 80;

  public weakness = [{ type: CardType.DARK }];

  public resistance = [{ type: CardType.FIGHTING, value: -20 }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Resetting Hole',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn (before your attack), if this Pokémon is on your Bench, you may discard any Stadium card in play. If you do, discard this Pokémon and all cards attached to it.'
    }
  ];

  public attacks = [
    {
      name: 'Red Knuckles',
      cost: [CardType.COLORLESS],
      damage: 10,
      damageCalculation: '+',
      text: 'If your opponent\'s Active Pokémon is an Ultra Beast, this attack does 60 more damage.'
    }
  ];

  public set: string = 'UNB';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '81';

  public name: string = 'Marshadow';

  public fullName: string = 'Marshadow UNB';

  public readonly REFRIGERATED_STREAM_MARKER = 'REFRIGERATED_STREAM_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      const player = effect.player;

      if (stadiumCard === undefined) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const cardList = StateUtils.findCardList(state, stadiumCard);
      const owner = StateUtils.findOwner(state, cardList);

      if (player.active.cards[0] == this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const marshadowCards = StateUtils.findCardList(state, this);

      // Check if this card is on bench
      const benchIndex = player.bench.indexOf(marshadowCards as PokemonCardList);
      if (benchIndex === -1) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Discard Stadium
      MOVE_CARDS(store, state, cardList, owner.discard);
      MOVE_CARDS(store, state, player.bench[benchIndex], player.discard, { sourceCard: this });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      DEAL_MORE_DAMAGE_IF_OPPONENT_ACTIVE_HAS_CARD_TAG(effect, state, 60, CardTag.ULTRA_BEAST);
    }

    return state;
  }
}