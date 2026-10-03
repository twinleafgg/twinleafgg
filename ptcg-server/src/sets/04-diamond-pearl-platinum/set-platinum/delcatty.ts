import { CardList, ChooseCardsPrompt, ConfirmPrompt, EnergyCard, GameError, GameMessage, PlayerType, ShowCardsPrompt, State, StateUtils, StoreLike, OrderCardsPrompt } from '../../../game';
import { BoardEffect, CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import {ADD_MARKER, HAS_MARKER, IS_POKEPOWER_BLOCKED, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Delcatty extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Skitty';
  public cardType: CardType[] = [C];
  public hp: number = 90;
  public weakness = [{ type: CardType.FIGHTING, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Power Circulation',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may search your discard pile for up to 2 basic Energy cards, show them to your opponent, and put those cards on top of your deck in any order. If you do, put 2 damage counters on Delcatty. This power can\'t be used if Delcatty is affected by a Special Condition.'
  }];

  public attacks = [
    {
      name: 'Power Heal',
      cost: [C],
      damage: 10,
      damageCalculation: '+',
      text: 'Does 10 damage plus 10 more damage for each damage counter on Delcatty. Then, remove 2 damage counters from Delcatty.'
    },
    {
      name: 'Rear Kick',
      cost: [C, C, C],
      damage: 60,
      text: ''
    }
  ];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Delcatty';
  public fullName: string = 'Delcatty PL';

  public readonly POWER_CIRCULATION_MARKER = 'POWER_CIRCULATION_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: AttackEffect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.POWER_CIRCULATION_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (HAS_MARKER(this.POWER_CIRCULATION_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (!player.discard.cards.some(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          const deckTop = new CardList();

          return store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DECK,
            player.discard,
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
            { min: 1, max: 2, allowCancel: false }
          ), selected => {
            if (selected.length === 0) return;

            selected.forEach(card => {
              MOVE_CARDS(store, state, player.discard, deckTop, { cards: [card], sourceCard: this });
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

              player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
                if (cardList.getPokemonCard() === this) {
                  cardList.damage += 20;
                }
              });

              ADD_MARKER(this.POWER_CIRCULATION_MARKER, player, this);

              player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
                if (cardList.getPokemonCard() === this) {
                  cardList.addBoardEffect(BoardEffect.ABILITY_USED);
                }
              });
            });
          });
        }
      });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const delcattyDamage = effect.player.active.damage;
      effect.damage += (delcattyDamage * 10 / 10);
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(20, effect, store, state);
      return state;
    }
    return state;
  }
}
