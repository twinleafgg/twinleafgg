import { ChooseCardsPrompt, GameError, GameMessage, PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, ADD_MARKER, COIN_FLIP_PROMPT, HAS_MARKER, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class MowRotom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: D, value: +20 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Mow Shift',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may use this power. Mow Rotom\'s type is Grass until the end of your turn.'
  }];

  public attacks = [{
    name: 'Slash',
    cost: [C, C],
    damage: 20,
    text: ''
  }, {
    name: 'Mow Down',
    cost: [G, C, C],
    damage: 50,
    text: 'Flip a coin. If heads, discard an Energy card attached to each of your opponent\'s Pokémon.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'RT4';
  public name: string = 'Mow Rotom';
  public fullName: string = 'Mow Rotom RR';

  public readonly MOW_SHIFT_MARKER = 'MOW_SHIFT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.MOW_SHIFT_MARKER, this);

    // Mow Shift
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (HAS_MARKER(this.MOW_SHIFT_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      ABILITY_USED(player, this);
      ADD_MARKER(this.MOW_SHIFT_MARKER, player, this);
    }

    if (effect instanceof CheckPokemonTypeEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      if (HAS_MARKER(this.MOW_SHIFT_MARKER, player, this)) {
        effect.cardTypes = [CardType.GRASS];
      }
    }

    // Mow Down
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
          const energyCards = cardList.cards.filter(c => c.superType === SuperType.ENERGY);
          if (energyCards.length === 0) {
            return;
          }
          if (energyCards.length === 1) {
            MOVE_CARDS(store, state, cardList, opponent.discard, { cards: energyCards, sourceCard: this });
            return;
          }
          store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            cardList,
            { superType: SuperType.ENERGY },
            { min: 1, max: 1, allowCancel: false }
          ), selected => {
            const cards = selected || [];
            if (cards.length > 0) {
              MOVE_CARDS(store, state, cardList, opponent.discard, { cards, sourceCard: this });
            }
          });
        });
      });
    }

    return state;
  }
}
