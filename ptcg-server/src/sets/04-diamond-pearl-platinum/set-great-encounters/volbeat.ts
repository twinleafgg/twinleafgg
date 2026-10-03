import { CardList, ChooseCardsPrompt, ConfirmPrompt, GameError, GameMessage, PlayerType, ShowCardsPrompt, State, StateUtils, StoreLike, TrainerCard } from '../../../game';
import { CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import {ADD_MARKER, HAS_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_POWER_USED, WAS_ATTACK_USED, COIN_FLIP_PROMPT, ABILITY_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Volbeat extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 70;
  public weakness = [{ type: R, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Light Conduct',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if you have Illumise in play, you may search your discard pile for a Supporter card, show it to your opponent, and put it on top of your deck. This power can\'t be used if Volbeat is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Firefly Light',
    cost: [G, G],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Confused.'
  }];

  public set: string = 'GE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '92';
  public name: string = 'Volbeat';
  public fullName: string = 'Volbeat GE';

  public readonly LIGHT_CONDUCT_MARKER = 'LIGHT_CONDUCT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: AttackEffect): State {

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.LIGHT_CONDUCT_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      //Once per turn
      if (HAS_MARKER(this.LIGHT_CONDUCT_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      // Cannot use if affected by special condition
      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      //Must have supporter in discard
      if (!player.discard.cards.some(c => c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let hasIllumiseInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.name === 'Illumise') {
          hasIllumiseInPlay = true;
        }
      });

      if (!hasIllumiseInPlay) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      //power effect
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
            { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
            { min: 1, max: 1, allowCancel: false }
          ), selected => {

            MOVE_CARDS(store, state, player.discard, deckTop, { cards: [selected[0]], sourceCard: this });
            deckTop.moveToTopOfDestination(player.deck);

            store.prompt(state, new ShowCardsPrompt(
              opponent.id,
              GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
              selected
            ), () => { });

            ADD_MARKER(this.LIGHT_CONDUCT_MARKER, player, this);
            ABILITY_USED(player, this);
          });
        }
      });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
        }
      });
    }

    return state;
  }
}
