import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PowerType,
  StateUtils,
  ConfirmPrompt,
  GameMessage,
  Card,
  ChooseCardsPrompt,
  PokemonCardList,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LilliesRibombee extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = "Lillie's Cutiefly";
  public cardType: CardType[] = [CardType.PSYCHIC];
  protected _tags = [CardTag.LILLIES];
  public hp: number = 70;
  public weakness = [{ type: CardType.METAL }];
  public retreat = [];

  public powers = [
    {
      name: 'Inviting Wink',
      powerType: PowerType.ABILITY,
      text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may have your opponent reveal their hand and you put any number of Basic Pokémon you find there onto their Bench.',
    },
  ];

  public attacks = [{ name: 'Magical Shot', cost: [CardType.PSYCHIC], damage: 50, text: '' }];

  public set: string = 'JTG';
  public regulationMark = 'I';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '67';
  public name: string = "Lillie's Ribombee";
  public fullName: string = "Lillie's Ribombee JTG";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Inviting Wink
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const slots: PokemonCardList[] = opponent.bench.filter((b) => b.cards.length === 0);

      // Try to reduce PowerEffect, to check if something is blocking our ability
      try {
        const powerEffect = new PowerEffect(player, this.powers[0], this);
        store.reduceEffect(state, powerEffect);
      } catch {
        return state;
      }

      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            if (opponent.hand.cards.length === 0) {
              return state;
            }
            // Check if bench has open slots
            const openSlots = opponent.bench.filter((b) => b.cards.length === 0);

            let cards: Card[] = [];
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                opponent.hand,
                { superType: SuperType.POKEMON, stage: Stage.BASIC },
                { min: 0, max: openSlots.length, allowCancel: false },
              ),
              (selected) => {
                cards = selected || [];

                // Operation canceled by the user
                if (cards.length === 0) {
                  return state;
                }

                cards.forEach((card, index) => {
                  MOVE_CARDS(store, state, opponent.hand, slots[index], { cards: [card], sourceCard: this });
                  slots[index].pokemonPlayedTurn = state.turn;
                });
              },
            );
          }
        },
      );
    }

    return state;
  }
}
