import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType } from '../../../game/store/card/card-types';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { PowerType, StoreLike, State, GameMessage, CardList, ChooseCardsPrompt, ShowCardsPrompt, StateUtils, EnergyCard, OrderCardsPrompt } from '../../../game';
import { ABILITY_USED, CONFIRMATION_PROMPT, DRAW_CARDS_UNTIL_CARDS_IN_HAND, IS_POKEPOWER_BLOCKED, MOVE_CARD_TO, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { PowerEffect } from '../../../game/store/effects/game-effects';

export class Dialga extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 100;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Reverse Time',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Dialga from your hand onto your Bench, you may search your discard pile for up to 3 in any combination of Pokémon (excluding Pokémon LV.X) and basic Energy cards. Show them to your opponent and put them on top of your deck in any order.'
  }];

  public attacks = [{
    name: 'Time-Space Traveling',
    cost: [M, C, C],
    damage: 50,
    text: 'Draw cards until you have 7 cards in your hand.'
  }];

  public set: string = 'PL';
  public setNumber: string = '5';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Dialga';
  public fullName: string = 'Dialga PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (!player.discard.cards.some(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC)
        && !player.discard.cards.some(c => c instanceof PokemonCard && c.stage !== Stage.LV_X)) {
        return state;
      }

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, player, wantToUse => {
        if (wantToUse) {
          const powerEffect = new PowerEffect(player, this.powers[0], this);
          store.reduceEffect(state, powerEffect);

          const blocked: number[] = [];
          player.discard.cards.forEach((c, index) => {
            const isPokemon = c instanceof PokemonCard && c.stage !== Stage.LV_X;
            const isBasicEnergy = c instanceof EnergyCard && c.energyType === EnergyType.BASIC;
            if (!isPokemon && !isBasicEnergy) {
              blocked.push(index);
            }
          });

          const deckTop = new CardList();
          return store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DECK,
            player.discard,
            {},
            { min: 1, max: 3, allowCancel: false, blocked }
          ), selected => {
            if (selected.length === 0) return;

            selected.forEach(card => {
              MOVE_CARD_TO(state, card, deckTop);
            });

            store.prompt(state, new OrderCardsPrompt(
              player.id,
              GameMessage.CHOOSE_CARDS_ORDER,
              deckTop,
              { allowCancel: false }
            ), order => {
              if (order === null) return state;

              deckTop.applyOrder(order);
              deckTop.moveToTopOfDestination(player.deck);

              store.prompt(state, new ShowCardsPrompt(
                opponent.id,
                GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                selected
              ), () => { });
            });
            ABILITY_USED(player, this);
          });
        }
      }, GameMessage.WANT_TO_USE_ABILITY);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS_UNTIL_CARDS_IN_HAND(effect.player, 7);
    }

    return state;
  }
}