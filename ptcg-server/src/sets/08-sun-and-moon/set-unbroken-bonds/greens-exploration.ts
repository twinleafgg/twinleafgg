import {
  ChooseCardsPrompt,
  PokemonCard,
  PowerType,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  StateUtils,
} from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GreensExploration extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '175';
  public name: string = "Green's Exploration";
  public fullName: string = "Green's Exploration UNB";

  public text: string = `You can play this card only if you have no Pokémon with Abilities in play.

Search your deck for up to 2 Trainer cards, reveal them, and put them into your hand. Then, shuffle your deck.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      let benchPokemon: PokemonCard[] = [];
      const pokemonWithAbilities: PokemonCard[] = [];
      const playerActive = player.active.getPokemonCard();

      const stubPowerEffectForActive = new PowerEffect(
        player,
        {
          name: 'test',
          powerType: PowerType.ABILITY,
          text: '',
        },
        player.active.getPokemonCard()!,
      );

      try {
        store.reduceEffect(state, stubPowerEffectForActive);

        if (
          playerActive &&
          playerActive.powers.some((power) => power.powerType === PowerType.ABILITY)
        ) {
          pokemonWithAbilities.push(playerActive);
        }
      } catch {
        // no abilities in active
      }

      if (player.bench.some((b) => b.cards.length > 0)) {
        const stubPowerEffectForBench = new PowerEffect(
          player,
          {
            name: 'test',
            powerType: PowerType.ABILITY,
            text: '',
          },
          player.bench.filter((b) => b.cards.length > 0)[0].getPokemonCard()!,
        );

        try {
          store.reduceEffect(state, stubPowerEffectForBench);

          benchPokemon = player.bench
            .map((b) => b.getPokemonCard())
            .filter((card) => card !== undefined) as PokemonCard[];
          pokemonWithAbilities.push(
            ...benchPokemon.filter((card) =>
              card.powers.some((power) => power.powerType === PowerType.ABILITY),
            ),
          );
        } catch {
          // no abilities on bench
        }
      }

      if (pokemonWithAbilities.length > 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.deck,
          { superType: SuperType.TRAINER },
          { min: 0, max: 2, allowCancel: false },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

            state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
              player.deck.applyOrder(order);
            });

            state = store.prompt(
              state,
              new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
              () => state,
            );
          }

          return state;
        },
      );
    }
    return state;
  }
}
