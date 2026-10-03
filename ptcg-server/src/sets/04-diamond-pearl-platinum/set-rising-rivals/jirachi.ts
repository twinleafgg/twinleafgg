import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType, SuperType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage, TrainerCard, ConfirmPrompt, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { PlaySupporterEffect, TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import {IS_POKEPOWER_BLOCKED, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Jirachi extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.METAL];
  public hp: number = 60;
  public weakness = [{ type: CardType.FIRE, value: +20 }];
  public resistance = [{ type: CardType.PSYCHIC, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Final Wish',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your opponent\'s turn, if Jirachi would be Knocked Out by damage from an attack, you may search your deck for any 1 card and put it into your hand. Shuffle your deck afterward.'
  }];

  public attacks = [
    {
      name: 'Detour',
      cost: [],
      damage: 0,
      text: 'If you have a Supporter card in play, use the effect of that card as the effect of this attack.'
    },
    {
      name: 'Swift',
      cost: [CardType.METAL],
      damage: 20,
      text: 'This attack\'s damage isn\'t affected by Weakness, Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.'
    }
  ];

  public set: string = 'RR';
  public setNumber: string = '7';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Jirachi';
  public fullName: string = 'Jirachi RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this) && effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)) {
      // This Pokemon was knocked out
      const player = effect.player;

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      return store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          let cards: any[] = [];
          return store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.deck,
            {},
            { min: 1, max: 1, allowCancel: false }),
            (selected: any[]) => {
              cards = selected || [];
              if (cards.length > 0) {
                MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });
              }
              SHUFFLE_DECK(store, state, player);
            });
        }
      });
    }

    if (effect instanceof PlaySupporterEffect) {
      const player = effect.player;
      if (!player.supportersForDetour.cards.includes(effect.trainerCard)) {
        player.supportersForDetour.cards.push(effect.trainerCard);
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.supportersForDetour.cards.length == 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_COPY_EFFECT,
        player.supportersForDetour,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { allowCancel: false, min: 1, max: 1 }
      ), cards => {
        const trainerCard = cards[0] as TrainerCard;
        player.supporterTurn -= 1;
        const playTrainerEffect = new TrainerEffect(player, trainerCard);
        store.reduceEffect(state, playTrainerEffect);
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const damage = 20; // Direct damage without weakness
      effect.damage = 0;

      if (damage > 0) {
        opponent.active.damage += damage;
        const afterDamage = new AfterDamageEffect(effect, damage);
        state = store.reduceEffect(state, afterDamage);
      }
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.supportersForDetour.cards = [];
    }

    return state;
  }
} 