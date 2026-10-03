import { CardTag, CardType, PokemonCard, Stage, State, StoreLike } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import {WAS_ATTACK_USED, BLOCK_IF_GX_ATTACK_USED, SHUFFLE_DECK, DRAW_CARDS, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";
import { PREVENT_DAMAGE } from "../../../game/store/prefabs/effect-of-attack-prefabs";

export class VenomothGx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Venonat';
  public cardType: CardType[] = [G];
  public hp: number = 200;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Shinobi Mastery',
      cost: [G, C, C],
      damage: 110,
      damageCalculation: '+',
      text: "If you played Koga's Trap from your hand during this turn, this attack does 90 more damage. If you played Janine from your hand during this turn, prevent all damage done to this Pokémon by attacks from Basic Pokémon during your opponent's next turn.",
    },
    {
      name: 'Ten-Card Return-GX',
      cost: [C],
      damage: 60,
      text: "Shuffle your hand into your deck. Then, draw 10 cards. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'UNB';
  public setNumber: string = '12';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Venomoth-GX';
  public fullName: string = 'Venomoth-GX UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shinobi Mastery
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.playedKogasTrap) {
        effect.damage += 90;
      }

      if (player.playedJanine) {
        PREVENT_DAMAGE(store, state, effect, this, { sourceStage: Stage.BASIC });
      }
    }

    // Ten-Card Return-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      const cards = player.hand.cards.slice();
      cards.forEach((c) => {
        MOVE_CARDS(store, state, player.hand, player.deck, { cards: [c], sourceCard: this });
      });
      SHUFFLE_DECK(store, state, player);
      DRAW_CARDS(store, state, player, 10);
    }

    return state;
  }
}
