import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  PlayerType,
  SlotType,
  ChoosePokemonPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt, Card } from '../../../game';
import { ShuffleDeckPrompt } from '../../../game';
import { StateUtils } from '../../../game/store/state-utils';

import {BLOCK_IF_GX_ATTACK_USED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

// GRI Sylveon-GX 92 (https://limitlesstcg.com/cards/GRI/92)
export class SylveonGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Eevee';

  public cardType: CardType[] = [CardType.FAIRY];

  public hp: number = 200;

  public weakness = [{ type: CardType.METAL }];

  public resistance = [{ type: CardType.DARK, value: -20 }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Magical Ribbon',
      cost: [CardType.FAIRY],
      damage: 0,
      text: 'Search your deck for up to 3 cards and put them into your hand. Then, shuffle your deck.',
    },
    {
      name: 'Fairy Wind',
      cost: [CardType.FAIRY, CardType.COLORLESS, CardType.COLORLESS],
      damage: 110,
      text: '',
    },
    {
      name: 'Plea-GX',
      cost: [CardType.FAIRY, CardType.COLORLESS, CardType.COLORLESS],
      damage: 0,
      text: "Put 2 of your opponent's Benched Pokémon and all cards attached to them into your opponent's hand. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'GRI';

  public setNumber = '92';

  public cardImage = 'assets/cardback.png';

  public name: string = 'Sylveon-GX';

  public fullName: string = 'Sylveon-GX GRI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Magical Ribbon
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let cards: Card[] = [];
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 0, max: 3, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });
          store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }

    // Plea-GX
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if player has used GX attack
      BLOCK_IF_GX_ATTACK_USED(player);
      // set GX attack as used for game
      player.usedGX = true;

      const hasBenched = opponent.bench.some((b) => b.cards.length > 0);
      if (!hasBenched) {
        return state;
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { min: 1, max: 2, allowCancel: false },
        ),
        (selection) => {
          selection.forEach((r) => {
            MOVE_CARDS(store, state, r, opponent.hand, { sourceCard: this });
            r.clearEffects();
          });
        },
      );
    }

    return state;
  }
}
