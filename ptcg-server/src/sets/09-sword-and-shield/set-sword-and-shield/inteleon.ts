import {
  PokemonCard,
  CardTag,
  Stage,
  CardType,
  PowerType,
  ChooseCardsPrompt,
  ConfirmPrompt,
  GameMessage,
  ShowCardsPrompt,
  State,
  StateUtils,
  StoreLike,
  SuperType,
  ShuffleDeckPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EvolveEffect } from '../../../game/store/effects/game-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Inteleon extends PokemonCard {
  protected _tags = [CardTag.RAPID_STRIKE];

  public regulationMark = 'D';

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Drizzile';

  public cardType: CardType[] = [CardType.WATER];

  public hp: number = 160;

  public weakness = [{ type: CardType.LIGHTNING }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Shady Dealings',
      powerType: PowerType.ABILITY,
      text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may search your deck for up to 2 Trainer cards, reveal them, and put them into your hand. Then, shuffle your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Aqua Bullet',
      cost: [W, C],
      damage: 120,
      text: "This attack also does 20 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'SSH';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '58';

  public name: string = 'Inteleon';

  public fullName: string = 'Inteleon SSH';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EvolveEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }
      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            state = store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.deck,
                { superType: SuperType.TRAINER },
                { min: 0, max: 2, allowCancel: false },
              ),
              (selected) => {
                const cards = selected || [];

                store.prompt(
                  state,
                  [
                    new ShowCardsPrompt(
                      opponent.id,
                      GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                      cards,
                    ),
                  ],
                  () => {
                    MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });
                  },
                );
                return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                  player.deck.applyOrder(order);
                });
              },
            );
          }
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(20, effect, store, state);
    }
    return state;
  }
}
