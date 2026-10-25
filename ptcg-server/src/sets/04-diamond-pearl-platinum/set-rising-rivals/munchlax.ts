import { CardType, ChooseCardsPrompt, GameError, GameMessage, PokemonCard, PokemonCardList, PowerType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { HealTargetEffect, RemoveSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { ADD_SLEEP_TO_PLAYER_ACTIVE, MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Munchlax extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +10 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Baby Evolution',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may put Snorlax from your hand onto Munchlax (this counts as evolving Munchlax) and remove all damage counters from Munchlax.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Rest',
    cost: [C, C],
    damage: 0,
    text: 'Remove all Special Conditions and 6 damage counters from Munchlax. Munchlax is now Asleep.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '69';
  public name: string = 'Munchlax';
  public fullName: string = 'Munchlax RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Baby Evolution
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEvolution = player.hand.cards.some(card => card instanceof PokemonCard && card.name === 'Snorlax');
      if (!hasEvolution) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      const blocked: number[] = [];
      player.hand.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name !== 'Snorlax') {
          blocked.push(index);
        }
      });
      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_EVOLVE,
        player.hand,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: true, blocked }
      ), selected => {
        const selectedCards = selected || [];
        if (selectedCards.length === 0) {
          return;
        }
        const evolution = selectedCards[0] as PokemonCard;
        const target = StateUtils.findCardList(state, this);
        MOVE_CARDS(store, state, player.hand, target, { cards: [evolution], sourceCard: this });
        const pokemonTarget = target as PokemonCardList;
        pokemonTarget.clearEffects();
        pokemonTarget.pokemonPlayedTurn = state.turn;
        store.reduceEffect(state, new HealEffect(player, pokemonTarget, pokemonTarget.damage));
      });
    }

    // Rest
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const healTargetEffect = new HealTargetEffect(effect, 60);
      healTargetEffect.target = player.active;
      store.reduceEffect(state, healTargetEffect);
      const removeSpecialCondition = new RemoveSpecialConditionsEffect(effect, undefined);
      removeSpecialCondition.target = player.active;
      store.reduceEffect(state, removeSpecialCondition);
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, player, this);
    }

    return state;
  }
}
