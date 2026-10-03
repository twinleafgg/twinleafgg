import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  Card,
  State,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  PlayerType,
  SlotType,
  ShuffleDeckPrompt,
  GameError,
  StateUtils,
  ConfirmPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { DiscardCardsEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { GameMessage } from '../../../game/game-message';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { ChooseEnergyPrompt } from '../../../game/store/prompts/choose-energy-prompt';
import {DAMAGE_OPPONENT_POKEMON, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Greninjaex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex, CardTag.POKEMON_TERA];
  public regulationMark = 'H';
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Frogadier';
  public cardType: CardType[] = [F];
  public hp: number = 310;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Shinobi Blade',
      cost: [W],
      damage: 170,
      text: 'You may search your deck for a card and put it into your hand. Then, shuffle your deck.',
    },
    {
      name: 'Mirage Barrage',
      cost: [W, C, C],
      damage: 0,
      text: "Discard 2 Energy from this Pokémon. This attack does 120 damage to 2 of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'TWM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '106';
  public name: string = 'Greninja ex';
  public fullName: string = 'Greninja ex TWM';

  public usedMirageBarrage: boolean = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.SEARCH_DECK_FOR_CARD),
        (wantToUse) => {
          if (wantToUse) {
            return store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.deck,
                {},
                { min: 1, max: 1, allowCancel: false },
              ),
              (cards) => {
                MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

                return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                  player.deck.applyOrder(order);
                });
              },
            );
          }
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      state = store.prompt(
        state,
        new ChooseEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          checkProvidedEnergy.energyMap,
          [CardType.COLORLESS, CardType.COLORLESS],
          { allowCancel: false },
        ),
        (energy) => {
          const max = Math.min(2);
          return store.prompt(
            state,
            new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
              PlayerType.TOP_PLAYER,
              [SlotType.ACTIVE, SlotType.BENCH],
              { min: 1, max: max, allowCancel: false },
            ),
            (selected) => {
              const targets = selected || [];
              DAMAGE_OPPONENT_POKEMON(store, state, effect, 120, targets);
              const cards: Card[] = (energy || []).map((e) => e.card);
              const discardEnergy = new DiscardCardsEffect(effect, cards);
              discardEnergy.target = player.active;
              store.reduceEffect(state, discardEnergy);
            },
          );
        },
      );
    }

    if (
      effect instanceof PutDamageEffect &&
      effect.target.cards.includes(this) &&
      effect.target.getPokemonCard() === this
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Target is not Active
      if (effect.target === player.active || effect.target === opponent.active) {
        return state;
      }

      effect.preventDefault = true;
    }
    return state;
  }
}
