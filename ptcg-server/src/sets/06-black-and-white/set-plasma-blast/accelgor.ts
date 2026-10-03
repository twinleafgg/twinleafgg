import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import {ADD_CONFUSION_TO_PLAYER_ACTIVE,
  AFTER_ATTACK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlayerType, State, StoreLike } from '../../../game';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
export class Accelgor extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Shelmet';
  public cardType: CardType[] = [G];
  public hp: number = 80;
  public weakness = [{ type: R }];
  public retreat = [];

  public attacks = [
    {
      name: 'Retribution',
      cost: [C],
      damage: 20,
      text: "If an Escavalier you had in play was Knocked Out by damage from an opponent's attack during his or her last turn, put all Energy attached to the Defending Pok\u00e9mon into your opponent's hand.",
    },
    {
      name: 'Signal Beam',
      cost: [G, C],
      damage: 30,
      text: 'The Defending Pok\u00e9mon is now Confused.',
    },
  ];

  public set: string = 'PLB';
  public setNumber: string = '8';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Accelgor';
  public fullName: string = 'Accelgor PLB';

  public readonly ESCAVALIER_KO_MARKER = 'ESCAVALIER_KO_MARKER';
  public readonly ESCAVALIER_DAMAGED_BY_OPPONENT_ATTACK_MARKER =
    'ESCAVALIER_DAMAGED_BY_OPPONENT_ATTACK_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Track Escavalier damaged by opponent's attack this turn.
    if (effect instanceof AfterDamageEffect && effect.damage > 0) {
      const damagedCard = effect.target.getPokemonCard();
      if (damagedCard?.name === 'Escavalier') {
        const owner = StateUtils.findOwner(state, effect.target);
        if (owner !== effect.player) {
          effect.target.marker.addMarker(this.ESCAVALIER_DAMAGED_BY_OPPONENT_ATTACK_MARKER, this);
        }
      }
    }

    // Track when your Escavalier is KO'd by damage from opponent's attack.
    if (effect instanceof KnockOutEffect) {
      const knockedOutCard = effect.target.getPokemonCard();
      if (
        knockedOutCard?.name === 'Escavalier' &&
        effect.target.marker.hasMarker(this.ESCAVALIER_DAMAGED_BY_OPPONENT_ATTACK_MARKER, this)
      ) {
        const owner = StateUtils.findOwner(state, effect.target);
        owner.marker.addMarker(this.ESCAVALIER_KO_MARKER, this);
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.marker.hasMarker(this.ESCAVALIER_KO_MARKER, this)) {
        // Put all energy from defending Pokemon into opponent's hand
        const energyCards = opponent.active.cards.filter((c) => c.superType === SuperType.ENERGY);
        energyCards.forEach((card) => {
          MOVE_CARDS(store, state, opponent.active, opponent.hand, { cards: [card], sourceCard: this });
        });
      }
    }

    if (AFTER_ATTACK(effect, 1, this)) {
      ADD_CONFUSION_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
    }

    // Marker cleanup
    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.ESCAVALIER_KO_MARKER, this);
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          cardList.marker.removeMarker(this.ESCAVALIER_DAMAGED_BY_OPPONENT_ATTACK_MARKER, this);
        });
      });
    }

    return state;
  }
}
