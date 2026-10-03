import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  TrainerType,
  SuperType,
  CardTag,
} from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { TrainerCard } from '../../../game/store/card/trainer-card';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TeamRocketsHonchkrow extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = "Team Rocket's Murkrow";
  protected _tags = [CardTag.TEAM_ROCKET];
  public cardType: CardType[] = [D];
  public hp: number = 130;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Rocket Feathers',
      cost: [C, C],
      damage: 60,
      damageCalculation: 'x',
      text: 'You may discard any number of Supporter cards with "Team Rocket" in their name from your hand, and this attack does 60 damage for each card you discarded in this way.',
    },
    {
      name: 'Hammer In',
      cost: [D, C, C],
      damage: 100,
      text: '',
    },
  ];

  public regulationMark: string = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '127';
  public name: string = "Team Rocket's Honchkrow";
  public fullName: string = "Team Rocket's Honchkrow M2a";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hand = player.hand;

      // Find Team Rocket Supporter cards in hand
      const teamRocketSupporters = hand.cards.filter(
        (card) =>
          card instanceof TrainerCard &&
          card.trainerType === TrainerType.SUPPORTER &&
          card.name.includes('Team Rocket'),
      );

      // Create blocked array for non-Team Rocket Supporters
      const blocked: number[] = [];
      hand.cards.forEach((card, index) => {
        if (
          !(
            card instanceof TrainerCard &&
            card.trainerType === TrainerType.SUPPORTER &&
            card.name.includes('Team Rocket')
          )
        ) {
          blocked.push(index);
        }
      });

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          hand,
          { superType: SuperType.TRAINER },
          { min: 0, max: teamRocketSupporters.length, allowCancel: false, blocked },
        ),
        (selected) => {
          const discardCount = selected || [];

          // Operation canceled by the user or no cards selected
          if (discardCount.length === 0) {
            effect.damage = 0;
            return state;
          }

          // Move selected cards to discard pile
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: discardCount, sourceCard: this });

          // Calculate damage: 60 per card discarded
          effect.damage = 60 * discardCount.length;
        },
      );
    }

    return state;
  }
}
