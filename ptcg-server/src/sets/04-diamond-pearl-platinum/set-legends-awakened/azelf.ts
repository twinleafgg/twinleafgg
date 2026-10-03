import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { PowerType, StoreLike, State, ConfirmPrompt, GameMessage, CardList, ChooseCardsPrompt, ShowCardsPrompt, StateUtils } from '../../../game';
import {IS_POKEPOWER_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { PowerEffect } from '../../../game/store/effects/game-effects';

export class Azelf extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 70;
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Time Walk',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Azelf from your hand onto your Bench, you may look at all of your face-down Prize cards. If you do, you may choose 1 Pokémon you find there, show it to your opponent, and put it into your hand. Then, choose 1 card in your hand and put it as a Prize card face down.'
  }];

  public attacks = [{
    name: 'Lock Up',
    cost: [P],
    damage: 20,
    text: 'The Defending Pokémon can\'t retreat during your opponent\'s next turn.'
  }];

  public set: string = 'LA';
  public setNumber: string = '19';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Azelf';
  public fullName: string = 'Azelf LA';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Time Walk
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      return store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          const powerEffect = new PowerEffect(player, this.powers[0], this);
          store.reduceEffect(state, powerEffect);

          const opponent = StateUtils.getOpponent(state, player);
          const prizes = player.prizes.filter(p => p.isSecret);

          prizes.forEach(p => { p.isSecret = false; });

          const cardList = new CardList();
          prizes.forEach(prizeList => {
            cardList.cards.push(...prizeList.cards);
          });

          // Prompt the player to choose a Pokémon from their prizes
          store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            cardList,
            { superType: SuperType.POKEMON },
            { min: 0, max: 1, allowCancel: false }
          ), chosenPrize => {

            if (chosenPrize.length > 0) {
              state = store.prompt(state, new ShowCardsPrompt(
                opponent.id,
                GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                chosenPrize
              ), () => { });

              player.prizes.forEach(p => {
                if (p.cards[0] === chosenPrize[0]) {
                  MOVE_CARDS(store, state, p, player.supporter, { cards: chosenPrize, sourceCard: this });
                }
              });

              store.prompt(state, new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARDS_TO_RETURN_TO_PRIZES,
                player.hand,
                {},
                { min: 1, max: 1, allowCancel: false }
              ), selected => {
                MOVE_CARDS(store, state, player.supporter, player.hand, { cards: chosenPrize, sourceCard: this });
                player.prizes.forEach(p => {
                  if (p.cards.length === 0) {
                    MOVE_CARDS(store, state, player.hand, p, { cards: selected, sourceCard: this });
                  }
                });
              });
            }

            player.prizes.forEach(p => {
              p.isSecret = true;
            });

            return state;
          });
        }
      }
      );
    }
    // Lock Up
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }
    return state;
  }
}