import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, ConfirmPrompt, GameMessage, PowerType, State, StateUtils, StoreLike, TrainerCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlaySupporterEffect, TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { IS_POKEPOWER_BLOCKED, MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Jirachi extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Final Wish',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your opponent\'s turn, if Jirachi would be Knocked Out by damage from an attack, you may search your deck for any 1 card and put it into your hand. Shuffle your deck afterward.'
  }];

  public attacks = [{
    name: 'Detour',
    cost: [],
    damage: 0,
    text: 'If you have a Supporter card in play, use the effect of that card as the effect of this attack.'
  }, {
    name: 'Swift',
    cost: [M],
    damage: 20,
    text: 'This attack\'s damage isn\'t affected by Weakness, Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Jirachi';
  public fullName: string = 'Jirachi RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Final Wish
    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this) && effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      return store.prompt(state, new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY), wantToUse => {
        if (!wantToUse) {
          return;
        }
        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 1, max: 1, allowCancel: false },
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: this });
          }
          SHUFFLE_DECK(store, state, player);
        });
      });
    }

    if (effect instanceof PlaySupporterEffect) {
      const player = effect.player;
      if (!player.supportersForDetour.cards.includes(effect.trainerCard)) {
        player.supportersForDetour.cards.push(effect.trainerCard);
      }
    }

    // Detour
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.supportersForDetour.cards.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_COPY_EFFECT,
        player.supportersForDetour,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { allowCancel: false, min: 1, max: 1 },
      ), cards => {
        const trainerCard = cards[0] as TrainerCard;
        player.supporterTurn -= 1;
        store.reduceEffect(state, new TrainerEffect(player, trainerCard));
      });
    }

    // Swift
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      effect.damage = 0;
      opponent.active.damage += 20;
      state = store.reduceEffect(state, new AfterDamageEffect(effect, 20));
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.supportersForDetour.cards = [];
    }

    return state;
  }
}
