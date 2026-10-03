import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { CardList, ChooseCardsPrompt, GameMessage, PowerType, ShuffleDeckPrompt, State, StateUtils, StoreLike, pokemonHasCardTypeOptional } from '../../..';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cobalion extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public regulationMark = 'F';
  public cardType: CardType[] = [M];
  public hp: number = 120;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Justified Law',
    powerType: PowerType.ABILITY,
    text: 'Your Basic Pokémon\'s attacks do 30 more damage to your opponent\'s Active [D] Pokémon (before applying Weakness and Resistance).'
  }];

  public attacks = [
    {
      name: 'Follow-Up',
      cost: [C, C],
      damage: 30,
      text: 'Choose up to 2 of your Benched Pokémon. For each of those Pokémon, search your deck for a basic Energy card and attach it to that Pokémon. Then, shuffle your deck.'
    }
  ];

  public set: string = 'SIT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '126';
  public name: string = 'Cobalion';
  public fullName: string = 'Cobalion SIT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {

      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.active.getPokemonCard()?.stage == Stage.BASIC && pokemonHasCardTypeOptional(opponent.active.getPokemonCard(), CardType.DARK)) {
        if (effect instanceof DealDamageEffect) {
          effect.damage += 30;
        }
        return state;
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {

      const player = effect.player;
      const basicPokemon = player.bench.filter(b => b.getPokemonCard()?.stage == Stage.BASIC);

      if (basicPokemon.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.deck,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 1, max: 2, allowCancel: true }
      ), selected => {
        const cards = selected || [];
        for (const card of cards) {
          MOVE_CARDS(store, state, player.deck, basicPokemon as unknown as CardList, { cards: [card], sourceCard: this });
        }
        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }
    return state;
  }
}