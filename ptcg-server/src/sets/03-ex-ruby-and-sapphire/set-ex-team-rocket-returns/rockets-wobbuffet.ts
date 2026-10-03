import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, TrainerType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  TrainerCard,
  ChooseCardsPrompt,
  Card,
  SelectPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { OPPONENTS_POKEMON_CANNOT_USE_THAT_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class RocketsWobbuffet extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.ROCKETS];
  public cardType: CardType[] = [D];
  public hp: number = 70;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Dark Aid',
      cost: [C],
      damage: 0,
      text: "Search your discard pile for Pokémon Tool cards and Rocket's Secret Machine cards. You may show either 1 Pokémon Tool card or Rocket's Secret Machine card to your opponent and put it into your hand, or show a combination of 3 Pokémon Tool cards or Rocket's Secret Machine cards to your opponent and shuffle them into your deck.",
    },
    {
      name: 'Amnesia',
      cost: [P, C],
      damage: 10,
      text: "Choose 1 of the Defending Pokémon's attacks. That Pokémon can't use that attack during your opponent's next turn.",
    },
  ];

  public set: string = 'TRR';
  public name: string = "Rocket's Wobbuffet";
  public fullName: string = "Rocket's Wobbuffet TRR";
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '47';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        const isTool = c instanceof TrainerCard && c.trainerType === TrainerType.TOOL;
        const isSecretMachine =
          c instanceof TrainerCard && c.hasTag(CardTag.ROCKETS_SECRET_MACHINE);
        if (!isTool && !isSecretMachine) {
          blocked.push(index);
        }
      });

      if (blocked.length === player.discard.cards.length) {
        return state;
      }

      const options: { message: GameMessage; action: () => void }[] = [
        {
          message: GameMessage.CHOOSE_CARD_TO_DECK,
          action: () => {
            let cards: Card[] = [];

            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_DECK,
                player.discard,
                {},
                { min: 0, max: 3, allowCancel: false, blocked },
              ),
              (selected) => {
                cards = selected || [];

                MOVE_CARDS(store, state, player.discard, player.deck, { cards });
                SHUFFLE_DECK(store, state, player);
              },
            );
          },
        },
        {
          message: GameMessage.CHOOSE_CARD_TO_HAND,
          action: () => {
            let cards: Card[] = [];

            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.discard,
                {},
                { min: 1, max: 1, allowCancel: false, blocked },
              ),
              (selected) => {
                cards = selected || [];

                MOVE_CARDS(store, state, player.discard, player.hand, { cards });
              },
            );
          },
        },
      ];

      return store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.CHOOSE_OPTION,
          options.map((opt) => opt.message),
          { allowCancel: false },
        ),
        (choice) => {
          const option = options[choice];
          option.action();
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const pokemonCard = effect.opponent.active.getPokemonCard();

      if (
        pokemonCard === undefined ||
        pokemonCard.attacks.length === 0 ||
        pokemonCard.stage !== Stage.BASIC
      ) {
        return state;
      }

      return OPPONENTS_POKEMON_CANNOT_USE_THAT_ATTACK(store, state, effect, this);
    }

    return state;
  }
}
