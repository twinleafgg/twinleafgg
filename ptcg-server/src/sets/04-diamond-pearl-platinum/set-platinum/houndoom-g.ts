import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { GameMessage, PlayerType, PokemonCardList, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { HANDLE_ABILITY_BLOCK, POKEPOWER_TYPES } from '../../../game/store/prefabs/ability-lock';
import { DISCARD_UP_TO_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class HoundoomG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [R];
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Black Cry',
    cost: [D, C],
    damage: 20,
    text: 'The Defending Pokémon can\'t retreat or use any Poké-Powers during your opponent\'s next turn.'
  }, {
    name: 'Dark Slash',
    cost: [D, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'You may discard a Darkness Energy attached to Houndoom G. If you do, this attack does 40 damage plus 20 more damage.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '50';
  public name: string = 'Houndoom G';
  public fullName: string = 'Houndoom G PL';

  public readonly BLACK_CRY_MARKER = 'BLACK_CRY_MARKER';
  public readonly BLACK_CRY_CLEAR_MARKER = 'BLACK_CRY_CLEAR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    HANDLE_ABILITY_BLOCK(effect, ({ card }) => {
      let cardList: PokemonCardList | undefined;
      if (card instanceof PokemonCardList) {
        cardList = card;
      } else if (card instanceof PokemonCard) {
        try {
          const found = StateUtils.findCardList(state, card);
          if (found instanceof PokemonCardList) {
            cardList = found;
          }
        } catch {
          return false;
        }
      }
      return cardList !== undefined && cardList.marker.hasMarker(this.BLACK_CRY_MARKER, this);
    }, {
      powerTypes: POKEPOWER_TYPES,
      error: GameMessage.BLOCKED_BY_EFFECT,
    });

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.BLACK_CRY_CLEAR_MARKER, this)) {
      effect.player.marker.removeMarker(this.BLACK_CRY_CLEAR_MARKER, this);
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        cardList.marker.removeMarker(this.BLACK_CRY_MARKER, this);
      });
    }

    // Black Cry
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      opponent.active.marker.addMarker(this.BLACK_CRY_MARKER, this);
      opponent.marker.addMarker(this.BLACK_CRY_CLEAR_MARKER, this);
      return BLOCK_RETREAT(store, state, effect, this);
    }

    // Dark Slash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return DISCARD_UP_TO_X_ENERGY_FROM_THIS_POKEMON(
        store,
        state,
        effect,
        1,
        { energyType: EnergyType.BASIC, name: 'Darkness Energy' },
        0,
        transfers => {
          if (transfers.length > 0) {
            effect.damage += 20;
          }
        }
      );
    }

    return state;
  }
}
