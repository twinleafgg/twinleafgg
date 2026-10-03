import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { THIS_POKEMON_HAS_NO_WEAKNESS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Escavalier extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Karrablast';
  public cardType: CardType[] = [M];
  public hp: number = 90;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Joust',
      cost: [M],
      damage: 30,
      text: 'Before doing damage, discard a Pokémon Tool card attached to the Defending Pokémon.'
    },
    {
      name: 'Cavalry Lance',
      cost: [M, M, C],
      damage: 70,
      text: 'During your opponent\'s next turn, this Pokémon has no Weakness.'
    }
  ];

  public set: string = 'DEX';
  public setNumber: string = '74';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Escavalier';
  public fullName: string = 'Escavalier DEX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Joust - discard Tool before damage
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if opponent's active has a tool attached
      if (opponent.active.tools.length > 0) {
        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.active,
          { superType: SuperType.TRAINER, trainerType: TrainerType.TOOL },
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: cards, sourceCard: this });
          }
        });
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      return THIS_POKEMON_HAS_NO_WEAKNESS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}
