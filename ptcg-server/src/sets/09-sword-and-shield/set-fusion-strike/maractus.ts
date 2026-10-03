import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage, TrainerCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Maractus extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [G];

  public hp: number = 110;

  public weakness = [{ type: R }];

  public retreat = [C, C];

  public attacks = [
    { name: 'Venomous Hit', cost: [G], damage: 20, text: '' },
    {
      name: 'Ditch and Shake',
      cost: [G, C],
      damage: 50,
      damageCalculation: 'x',
      text: 'Discard any number of Pokémon Tool cards from your hand. ' +
        'This attack does 50 damage for each card you discarded in this way. '
    },
  ];

  public set: string = 'FST';

  public name: string = 'Maractus';

  public fullName: string = 'Maractus FST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '12';

  public regulationMark: string = 'E';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const blocked = player.hand.cards
        .filter(c => c instanceof TrainerCard && c.trainerType !== TrainerType.TOOL)
        .map(c => player.hand.cards.indexOf(c));

      // Prompt player to choose cards to discard 
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.TRAINER },
        { allowCancel: false, min: 0, blocked }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        const discardEnergy = new DiscardCardsEffect(effect, cards);
        discardEnergy.target = player.active;
        store.reduceEffect(state, discardEnergy);
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

        // Calculate damage
        const damage = cards.length * 50;
        effect.damage = damage;
        return state;
      });
    }
    return state;
  }

}
