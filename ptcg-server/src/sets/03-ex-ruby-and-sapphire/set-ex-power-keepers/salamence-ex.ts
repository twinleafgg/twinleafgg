import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { PlayerType, StateUtils } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';

export class Salamenceex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Shelgon';
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [C];
  public hp: number = 160;
  public weakness = [{ type: C }];
  public resistance = [
    { type: R, value: -30 },
    { type: F, value: -30 },
  ];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Volcanic Flame',
      cost: [R, R, C, C],
      damage: 150,
      text: 'Discard the top 5 cards of your deck.',
    },
    {
      name: 'Hydro Wave',
      cost: [W, W, C, C],
      damage: 0,
      text: "Discard all [W] Energy attached to Salamence ex. This attack does 30 damage to each of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'PK';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  public name: string = 'Salamence ex';
  public fullName: string = 'Salamence ex PK';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.discard, { count: 5, sourceCard: this });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergy);

      checkProvidedEnergy.energyMap.forEach((em) => {
        if (em.provides.includes(CardType.WATER) || em.provides.includes(CardType.ANY)) {
          MOVE_CARDS(store, state, player.active, player.discard, { cards: [em.card] });
        }
      });

      const opponent = StateUtils.getOpponent(state, player);
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        if (cardList !== opponent.active) {
          const damageEffect = new PutDamageEffect(effect, 30);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
