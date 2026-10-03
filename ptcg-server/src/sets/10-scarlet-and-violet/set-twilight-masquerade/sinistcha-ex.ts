import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  EnergyType,
  CardTag,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PlayerType,
  GameMessage,
  SlotType,
  ChoosePokemonPrompt,
  EnergyCard,
  ShuffleDeckPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealTargetEffect, PutCountersEffect } from '../../../game/store/effects/attack-effects';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Sinistchaex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Poltchageist';
  public cardType: CardType[] = [CardType.GRASS];
  public hp: number = 240;
  public weakness = [{ type: CardType.FIRE }];
  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Re-Brew',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: "Put 2 damage counters on 1 of your opponent's Pokémon for each Basic [G] Energy card in your discard pile. Then, shuffle those Energy cards into your deck.",
    },
    {
      name: 'Matcha Splash',
      cost: [CardType.GRASS, CardType.COLORLESS],
      damage: 120,
      text: 'Heal 30 damage from each of your Pokémon.',
    },
  ];

  public set: string = 'TWM';
  public name: string = 'Sinistcha ex';
  public fullName: string = 'Sinistcha ex TWM';
  public regulationMark = 'H';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '23';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Re-Brew
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      // counting the energies
      const grassInDiscard = player.discard.cards.filter(
        (c) => c.superType === SuperType.ENERGY && c.name === 'Grass Energy',
      ).length;
      if (grassInDiscard === 0) {
        return state;
      }

      store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false },
        ),
        (targets) => {
          const damageEffect = new PutCountersEffect(effect, 20 * grassInDiscard);
          damageEffect.target = targets[0];
          store.reduceEffect(state, damageEffect);
        },
      );
      // slapping those energies back into the deck
      player.discard.cards.forEach((c) => {
        if (
          c instanceof EnergyCard &&
          c.energyType === EnergyType.BASIC &&
          c.name === 'Grass Energy'
        ) {
          MOVE_CARDS(store, state, player.discard, player.deck, { cards: [c], sourceCard: this });
        }
      });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });
    }

    // Matcha Splash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      player.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        const healTargetEffect = new HealTargetEffect(effect, 30);
        healTargetEffect.target = cardList;
        state = store.reduceEffect(state, healTargetEffect);
      });
    }

    return state;
  }
}
