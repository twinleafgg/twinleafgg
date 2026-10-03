import { GameError, GameMessage, PowerType, StateUtils, StoreLike, State } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { CardType, Stage, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {ABILITY_USED,
  IS_ABILITY_BLOCKED,
  SHUFFLE_DECK,
  SHOW_CARDS_TO_PLAYER,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ChooseEnergyPrompt } from '../../../game/store/prompts/choose-energy-prompt';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Silvally extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Type: Null';
  public cardType: CardType[] = [C];
  public hp: number = 140;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Call a Buddy',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, if you have no cards in your hand, you may use this Ability. Search your deck for a Supporter card, reveal it, and put it into your hand. Then, shuffle your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Air Slash',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 130,
      text: 'Discard an Energy attached to this Pokémon.',
    },
  ];

  public set: string = 'PBL';
  public setNumber: string = '70';
  public regulationMark: string = 'J';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Silvally';
  public fullName: string = 'Silvally M5';

  public readonly BUDDY_MARKER = 'M5_SILVALLY_BUDDY';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      effect.player.marker.removeMarker(this.BUDDY_MARKER, this);
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.BUDDY_MARKER, this)
    ) {
      effect.player.marker.removeMarker(this.BUDDY_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      if (player.marker.hasMarker(this.BUDDY_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.hand.cards.length !== 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.NO_CARDS_IN_DECK);
      }

      player.marker.addMarker(this.BUDDY_MARKER, this);
      ABILITY_USED(player, this);

      const opponent = StateUtils.getOpponent(state, player);
      const blocked: number[] = [];
      player.deck.cards.forEach((c, idx) => {
        if (!(c instanceof TrainerCard) || c.trainerType !== TrainerType.SUPPORTER) {
          blocked.push(idx);
        }
      });

      if (blocked.length >= player.deck.cards.length) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 1, max: 1, blocked, allowCancel: false },
        ),
        (picked) => {
          const sel = picked || [];
          if (sel.length > 0) {
            SHOW_CARDS_TO_PLAYER(store, state, opponent, sel);
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: sel, sourceCard: this });
          }
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const atk = effect as AttackEffect;

      const check = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, check);

      return store.prompt(
        state,
        new ChooseEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          check.energyMap,
          [CardType.COLORLESS],
          { allowCancel: false },
        ),
        (sel) => {
          const cards = (sel || []).map((e) => e.card).filter(Boolean);
          if (cards.length === 0) {
            return;
          }
          const discard = new DiscardCardsEffect(atk, cards);
          discard.target = player.active;
          store.reduceEffect(state, discard);
        },
      );
    }

    return state;
  }
}
