import { PlayerType, PokemonCard, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckHpEffect, CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Metagross extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Metang';
  public hp: number = 130;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +30 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Gravitation',
    powerType: PowerType.POKEBODY,
    text: 'Each Pokémon in play (both yours and your opponent\'s) gets -20 HP. No more than 20 HP can be reduced by all Gravitation Poké-Bodies.'
  }];

  public attacks = [{
    name: 'Geo Impact',
    cost: [M, M, C],
    damage: 60,
    text: 'If you have a Stadium card in play, this attack does 20 damage to each of your opponent\'s Benched Pokémon that is the same type as the Defending Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Metagross';
  public fullName: string = 'Metagross SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Gravitation
    if (effect instanceof CheckHpEffect) {
      let isInPlay = false;
      let firstGravitation: PokemonCard | undefined;
      state.players.forEach(player => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
          if (card === this) {
            isInPlay = true;
          }
          if (firstGravitation === undefined && card.powers.some(power => power.name === 'Gravitation')) {
            if (!IS_POKEBODY_BLOCKED(store, state, player, card)) {
              firstGravitation = card;
            }
          }
        });
      });
      if (!isInPlay || firstGravitation !== this) {
        return state;
      }
      effect.hp -= 20;
    }

    // Geo Impact
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (player.stadium.cards.length === 0 && (
        !stadiumCard || StateUtils.findOwner(state, StateUtils.findCardList(state, stadiumCard)) !== player
      )) {
        return state;
      }

      const opponent = StateUtils.getOpponent(state, player);
      const defendingType = new CheckPokemonTypeEffect(opponent.active);
      store.reduceEffect(state, defendingType);
      opponent.bench.forEach(cardList => {
        if (cardList.cards.length === 0) {
          return;
        }
        const benchType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, benchType);
        if (benchType.cardTypes.some(t => defendingType.cardTypes.includes(t))) {
          const damageEffect = new PutDamageEffect(effect, 20);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
