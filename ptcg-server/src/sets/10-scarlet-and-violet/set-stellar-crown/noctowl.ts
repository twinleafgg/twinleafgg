import {
  PokemonCard,
  Stage,
  CardType,
  StoreLike,
  State,
  PowerType,
  ChooseCardsPrompt,
  ConfirmPrompt,
  GameMessage,
  ShowCardsPrompt,
  StateUtils,
  SuperType,
  CardTag,
  GameError,
  ShuffleDeckPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Noctowl extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Hoothoot';

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 100;

  public weakness = [{ type: CardType.LIGHTNING }];

  public resistance = [{ type: CardType.FIGHTING, value: -30 }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Jewel Seeker',
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, when you play this Pokémon from your hand to evolve 1 of your Pokémon, if you have any Tera Pokémon in play, you may search your deck for up to 2 Trainer cards, reveal them, and put them into your hand. Then, shuffle your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Speed Wing',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 60,
      text: '',
    },
  ];

  public regulationMark = 'H';

  public set: string = 'SCR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '115';

  public name: string = 'Noctowl';

  public fullName: string = 'Noctowl SCR';

  public readonly JEWEL_HUNT_MARKER = 'JEWEL_HUNT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.JEWEL_HUNT_MARKER, this);
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        return state;
      }

      if (player.marker.hasMarker(this.JEWEL_HUNT_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      let teraPokemonCount = 0;

      if (player.active?.getPokemonCard()?.hasTag(CardTag.POKEMON_TERA)) {
        teraPokemonCount++;
      }

      player.bench.forEach((benchSpot) => {
        if (benchSpot.getPokemonCard()?.hasTag(CardTag.POKEMON_TERA)) {
          teraPokemonCount++;
        }
      });

      if (teraPokemonCount == 0) {
        return state;
      }

      if (teraPokemonCount >= 1) {
        // Try to reduce PowerEffect, to check if something is blocking our ability
        try {
          const stub = new PowerEffect(
            player,
            {
              name: 'test',
              powerType: PowerType.ABILITY,
              text: '',
            },
            this,
          );
          store.reduceEffect(state, stub);
        } catch {
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
                      player.marker.addMarker(this.JEWEL_HUNT_MARKER, this);
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
    }
    return state;
  }
}
