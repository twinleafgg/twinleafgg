import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  TrainerType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  ChooseCardsPrompt,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { OPPONENTS_POKEMON_CANNOT_USE_THAT_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class TeamRocketsMurkrow extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.TEAM_ROCKET];
  public cardType: CardType[] = [D];
  public hp: number = 80;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Deceit',
      cost: [C],
      damage: 0,
      text: 'Search your deck for a Supporter card, reveal it, and put it into your hand. Then, shuffle your deck.',
    },
    {
      name: 'Torment',
      cost: [D, C],
      damage: 30,
      text: "Choose 1 of your opponent's Active Pokémon's attacks. During your opponent's next turn, that Pokémon can't use that attack.",
    },
  ];

  public regulationMark = 'I';
  public set: string = 'DRI';
  public setNumber: string = '127';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Team Rocket's Murkrow";
  public fullName: string = "Team Rocket's Murkrow DRI";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        return state;
      }

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof TrainerCard && card.trainerType === TrainerType.SUPPORTER)) {
          blocked.push(index);
        }
      });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
          { min: 0, max: 1, allowCancel: true, blocked },
        ),
        (selected) => {
          const cards = selected || [];

          if (cards.length === 0) {
            return state;
          }

          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          return store.prompt(
            state,
            new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
            () => {
              return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                player.deck.applyOrder(order);
              });
            },
          );
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      return OPPONENTS_POKEMON_CANNOT_USE_THAT_ATTACK(store, state, effect, this);
    }

    return state;
  }
}
