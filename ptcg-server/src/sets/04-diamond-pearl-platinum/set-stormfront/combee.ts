import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PowerType, StoreLike, State, PokemonCardList, Card, ChooseCardsPrompt, SuperType } from '../../../game';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PlayPokemonEffect, PlayPokemonFromDiscardEffect } from '../../../game/store/effects/play-card-effects';
import { GameMessage } from '../../../game/game-message';
import { DRAW_CARDS, WAS_ATTACK_USED, CONFIRMATION_PROMPT, SWITCH_ACTIVE_WITH_BENCHED } from '../../../game/store/prefabs/prefabs';

export class Combee extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 50;
  public weakness = [{ type: R, value: +10 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Honey',
    powerType: PowerType.HELD_ITEM,
    text: 'Once during your turn, when you put Combee from your hand onto your Bench, you may search your discard pile for a Basic Pokémon and put it onto your Bench.'
  }];

  public attacks = [{
    name: 'Alert',
    cost: [C],
    damage: 0,
    text: 'Draw a card. Then, you may switch Combee with 1 of your Benched Pokémon.'
  }];

  public set: string = 'SF';
  public name: string = 'Combee';
  public fullName: string = 'Combee SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '57';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter(b => b.cards.length === 0);

      // No cards in discard
      if (player.discard.cards.length === 0) {
        return state;
      }
      // Check if bench has open slots
      const openSlots = player.bench.filter(b => b.cards.length === 0);

      // No open slots
      if (openSlots.length === 0) {
        return state;
      }

      let cards: Card[] = [];
      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
        player.discard,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        cards = selected || [];
        cards.forEach((card, index) => {
          store.reduceEffect(state, new PlayPokemonFromDiscardEffect(player, card as PokemonCard, slots[index]));
        });
      });

      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      DRAW_CARDS(store, state, player, 1);

      CONFIRMATION_PROMPT(store, state, player, result => {
        if (result) {
          SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
        }
      });
    }

    return state;
  }

}