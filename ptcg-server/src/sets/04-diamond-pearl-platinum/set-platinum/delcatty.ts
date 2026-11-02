import { CardList, ChooseCardsPrompt, EnergyCard, GameError, GameMessage, OrderCardsPrompt, PlayerType, PokemonCard, PokemonCardList, PowerType, ShowCardsPrompt, State, StateUtils, StoreLike } from '../../../game';
import { BoardEffect, CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { ABILITY_USED, ADD_MARKER, HAS_MARKER, HEAL_X_DAMAGE_FROM_THIS_POKEMON, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, THIS_ATTACK_DOES_X_MORE_DAMAGE, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Delcatty extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Skitty';
  public cardType: CardType[] = [C];
  public hp: number = 90;
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Power Circulation',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may search your discard pile for up to 2 basic Energy cards, show them to your opponent, and put those cards on top of your deck in any order. If you do, put 2 damage counters on Delcatty. This power can\'t be used if Delcatty is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Power Heal',
    cost: [C],
    damage: 10,
    damageCalculation: '+',
    text: 'Does 10 damage plus 10 more damage for each damage counter on Delcatty. Then, remove 2 damage counters from Delcatty.'
  }, {
    name: 'Rear Kick',
    cost: [C, C, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Delcatty';
  public fullName: string = 'Delcatty PL';

  public readonly POWER_CIRCULATION_MARKER = 'POWER_CIRCULATION_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.POWER_CIRCULATION_MARKER, this);

    // Power Circulation
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      if (HAS_MARKER(this.POWER_CIRCULATION_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      if (cardList.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (!player.discard.cards.some(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const deckTop = new CardList();
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.discard,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 1, max: 2, allowCancel: false }
      ), selected => {
        if (selected.length === 0) {
          return;
        }

        selected.forEach(card => {
          MOVE_CARDS(store, state, player.discard, deckTop, { cards: [card], sourceCard: this });
        });

        store.prompt(state, new OrderCardsPrompt(
          player.id,
          GameMessage.CHOOSE_CARDS_ORDER,
          deckTop,
          { allowCancel: false }
        ), order => {
          if (order === null) {
            return state;
          }

          deckTop.applyOrder(order);
          deckTop.moveToTopOfDestination(player.deck);

          store.prompt(state, new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            selected
          ), () => { });

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, list => {
            if (list.getPokemonCard() === this) {
              store.reduceEffect(state, new PlaceDamageCountersEffect(player, list, 20, this, this.powers[0]));
            }
          });

          ADD_MARKER(this.POWER_CIRCULATION_MARKER, player, this);
          ABILITY_USED(player, this);

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, list => {
            if (list.getPokemonCard() === this) {
              list.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });
        });
      });
    }

    // Power Heal
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_MORE_DAMAGE(effect, store, state, effect.player.active.damage);
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 20);
    }

    return state;
  }
}
