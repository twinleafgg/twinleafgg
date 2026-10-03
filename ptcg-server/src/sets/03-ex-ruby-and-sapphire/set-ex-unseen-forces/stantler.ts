import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, Card, ChooseCardsPrompt, GameMessage, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';

export class Stantler extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Screechy Voice',
    cost: [C],
    damage: 10,
    text: 'If the Defending Pokémon is an Evolved Pokémon, the Defending Pokémon is now Confused.'
  },
  {
    name: 'Push Away',
    cost: [C, C],
    damage: 20,
    text: 'Look at your opponent\'s hand, choose a Trainer card you find there, and discard it.'
  }];

  public set: string = 'UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '32';
  public name: string = 'Stantler';
  public fullName: string = 'Stantler UF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.opponent.active.getPokemons().length > 1) {
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const minDiscard = Math.min(opponent.hand.cards.filter(c => c.superType === SuperType.TRAINER).length, 1);

      let cards: Card[] = [];
      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        opponent.hand,
        { superType: SuperType.TRAINER },
        { min: minDiscard, max: 1, allowCancel: false }
      ), selected => {
        cards = selected || [];
        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
      });
    }

    return state;
  }
}