import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, Card, ChooseCardsPrompt, GameMessage, PowerType, GameError, PokemonCardList, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import {AFTER_ATTACK, DRAW_CARDS, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cleffa extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 40;
  public weakness = [{ type: F, value: +10 }];
  public retreat = [C];

  public powers = [{
    name: 'Baby Evolution',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may put Clefairy from your hand onto Cleffa (this counts as evolving Cleffa) and remove all damage counters from Cleffa.'
  }];

  public attacks = [
    {
      name: 'Eeek',
      cost: [],
      damage: 0,
      text: 'Draw a card.'
    }
  ];

  public set: string = 'DP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '78';
  public name: string = 'Cleffa';
  public fullName: string = 'Cleffa DP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasClefairy = player.hand.cards.some(card => card instanceof PokemonCard && card.name === 'Clefairy');

      // Check if Clefairy is in the player's hand
      if (!hasClefairy) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Blocking pokemon cards, that cannot be valid evolutions
      const blocked: number[] = [];
      player.hand.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name !== 'Clefairy') {
          blocked.push(index);
        }
      });

      let selectedCards: Card[] = [];
      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_EVOLVE,
        player.hand,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: true, blocked }
      ), selected => {
        selectedCards = selected || [];

        const evolution = selectedCards[0] as PokemonCard;

        const target = StateUtils.findCardList(state, this);

        // Evolve Pokemon
        MOVE_CARDS(store, state, player.hand, target, { cards: [evolution], sourceCard: this });
        const pokemonTarget = target as PokemonCardList;
        pokemonTarget.clearEffects();
        pokemonTarget.pokemonPlayedTurn = state.turn;

        // Heal all damage from the evolved Pokemon
        const healEffect = new HealEffect(player, pokemonTarget, pokemonTarget.damage);
        store.reduceEffect(state, healEffect);

        return state;
      });
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      DRAW_CARDS(store, state, effect.player, 1);
    }

    return state;
  }
}
