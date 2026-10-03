import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, StateUtils, GameError, GameMessage, ShuffleDeckPrompt, PokemonCardList } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, IS_ABILITY_BLOCKED, BLOCK_IF_GX_ATTACK_USED, SWITCH_ACTIVE_WITH_BENCHED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_DOES_LESS_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class SuicuneGx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 180;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public usedBriniclesGx = false;

  public powers = [
    {
      name: 'Phantom Winds',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn (before your attack), if this Pokémon is on your Bench, you may shuffle it and all cards attached to it into your deck.',
    },
  ];

  public attacks = [{
    name: 'Cure Stream',
    cost: [W, W, C],
    damage: 120,
    text: 'During your opponent\'s next turn, the Defending Pokémon\'s attacks do 30 less damage (before applying Weakness and Resistance).'
  },
  {
    name: 'Brinicles-GX',
    cost: [W, W, C],
    damage: 150,
    text: 'Switch this Pokémon with 1 of your Benched Pokémon. (You can\'t use more than 1 GX attack in a game.)'
  }];

  public set: string = 'LOT';
  public setNumber: string = '60';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Suicune-GX';
  public fullName: string = 'Suicune-GX LOT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Phantom Winds
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      if (cardList === player.active) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const tools = cardList.tools.slice();
      tools.forEach(t => { MOVE_CARDS(store, state, cardList, player.deck, { cards: [t], sourceCard: this }); });
      MOVE_CARDS(store, state, cardList, player.deck, { sourceCard: this });
      cardList.clearEffects();

      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });
    }

    // Cure Stream
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_DOES_LESS_DAMAGE(store, state, effect, this, 30);
    }

    // Brinicles-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      BLOCK_IF_GX_ATTACK_USED(effect.player);
      effect.player.usedGX = true;
      this.usedBriniclesGx = true;
    }

    if (effect instanceof AfterAttackEffect && this.usedBriniclesGx) {
      this.usedBriniclesGx = false;
      const player = effect.player;

      if (player.bench.some((b) => b.cards.length > 0)) {
        SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
      }
    }

    if (effect instanceof EndTurnEffect) {
      this.usedBriniclesGx = false;
    }

    return state;
  }
}
