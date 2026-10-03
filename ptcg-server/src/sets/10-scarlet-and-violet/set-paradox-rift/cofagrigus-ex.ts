import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  SlotType,
  GamePhase,
  Card,
  ChooseCardsPrompt,
  ShuffleDeckPrompt,
  PowerType,
  GameLog,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE } from '../../../game/store/prefabs/attack-effects';

export class Cofagrigusex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Yamask';
  public cardType: CardType[] = [CardType.PSYCHIC];
  public hp: number = 260;
  public weakness = [{ type: CardType.DARK }];
  public resistance = [{ type: CardType.FIGHTING, value: -30 }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Gold Coffin',
      powerType: PowerType.ABILITY,
      text: "If this Pokémon is Knocked Out by damage from an attack from your opponent's Pokémon, search your deck for a card and put it into your hand. Then, shuffle your deck.",
    },
  ];

  public attacks = [
    {
      name: 'Hollow Hands',
      cost: [CardType.PSYCHIC, CardType.PSYCHIC],
      damage: 110,
      text: "Put 5 damage counters on your opponent's Benched Pokémon in any way you like.",
    },
  ];

  public set: string = 'PAR';
  public regulationMark = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';

  public name: string = 'Cofagrigus ex';
  public fullName: string = 'Cofagrigus ex PAR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Gold Coffin
    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this)) {
      const player = effect.player;

      // i love checking for ability lock woooo
      try {
        const powerEffect = new PowerEffect(player, this.powers[0], this);
        store.reduceEffect(state, powerEffect);
      } catch {
        return state;
      }

      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      if (player.deck.cards.length === 0) {
        return state;
      }

      store.log(state, GameLog.LOG_PLAYER_USES_ABILITY, {
        name: player.name,
        card: 'Cofagrigus ex',
      });

      let cards: Card[] = [];
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 0, max: 1, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });
        },
      );

      store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });
    }

    // Hollow Hands
    if (WAS_ATTACK_USED(effect, 0, this)) {
      PUT_X_DAMAGE_COUNTERS_IN_ANY_WAY_YOU_LIKE(5, store, state, effect, [SlotType.BENCH]);
    }

    return state;
  }
}
