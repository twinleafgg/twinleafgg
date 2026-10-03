import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { GameError, GameMessage, PlayerType, PokemonCard, PowerType } from '../../../game';

import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HisuianZoroarkVSTAR extends PokemonCard {
  public stage: Stage = Stage.VSTAR;

  public evolvesFrom = 'Hisuian Zoroark V';

  protected _tags = [CardTag.POKEMON_VSTAR];

  public regulationMark = 'F';

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 270;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Phantom Star',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: "During your turn, you may discard your hand and draw 7 cards. (You can't use more than 1 VSTAR Power in a game.)",
    },
  ];

  public attacks = [
    {
      name: 'Ticking Curse',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 50,
      damageCalculator: 'x',
      text: 'This attack does 50 damage for each of your Pokémon that has any damage counters on it.',
    },
  ];

  public set: string = 'LOR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '147';

  public name: string = 'Hisuian Zoroark VSTAR';

  public fullName: string = 'Hisuian Zoroark VSTAR LOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.usedVSTAR === true) {
        throw new GameError(GameMessage.LABEL_VSTAR_USED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const cards = player.hand.cards.filter((c) => c !== this);
      MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 7, sourceCard: this });
      player.usedVSTAR = true;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasBenched = player.bench.some((b) => b.cards.length > 0);
      if (!hasBenched) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      let benchPokemonWithDamage = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList.damage !== 0) {
          benchPokemonWithDamage++;
        }
      });

      effect.damage = benchPokemonWithDamage * 50;
    }

    return state;
  }
}
