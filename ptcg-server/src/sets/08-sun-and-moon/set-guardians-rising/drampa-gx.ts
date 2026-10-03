import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  EnergyType,
  CardTag,
} from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, Card, ChooseCardsPrompt } from '../../../game';
import { ShuffleDeckPrompt } from '../../../game';
import { PlayerType } from '../../../game';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import {BLOCK_IF_GX_ATTACK_USED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useWhirlpool(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  // Defending Pokemon has no energy cards attached
  if (!opponent.active.cards.some((c) => c.superType === SuperType.ENERGY)) {
    return state;
  }

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DISCARD,
      opponent.active,
      { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
      { min: 1, max: 1, allowCancel: true },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  const discardEnergy = new DiscardCardsEffect(effect, cards);
  return store.reduceEffect(state, discardEnergy);
}

export class DrampaGX extends PokemonCard {
  public stage: Stage = Stage.BASIC;

  protected _tags = [CardTag.POKEMON_GX];

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 180;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Righteous Edge',
      cost: [CardType.COLORLESS],
      damage: 20,
      text: "Discard a Special Energy from your opponent's Active Pokémon.",
    },
    {
      name: 'Berserk',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 80,
      text: 'If your Benched Pokémon have any damage counters on them, this attack does 70 more damage.',
    },
    {
      name: 'Big Wheel-GX',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: "Shuffle your hand into your deck. Then, draw 10 cards. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'GRI';

  public setNumber = '115';

  public cardImage = 'assets/cardback.png';

  public name: string = 'Drampa-GX';

  public fullName: string = 'Drampa-GX GRI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useWhirlpool(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      // checking if this pokemon is in play
      let isThereDamage = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (cardList === player.active) {
          return;
        }
        if (cardList.damage > 0) {
          isThereDamage = true;
        }
      });
      if (isThereDamage) {
        effect.damage += 70;
      }
    }

    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;

      // Check if player has used GX attack
      BLOCK_IF_GX_ATTACK_USED(player);
      // set GX attack as used for game
      player.usedGX = true;

      if (player.hand.cards.length > 0) {
        MOVE_CARDS(store, state, player.hand, player.deck, { cards: player.hand.cards, sourceCard: this });

        return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
          player.deck.applyOrder(order);
          while (player.hand.cards.length < 10) {
            if (player.deck.cards.length === 0) {
              break;
            }
            MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
          }
        });
      }
    }

    return state;
  }
}
