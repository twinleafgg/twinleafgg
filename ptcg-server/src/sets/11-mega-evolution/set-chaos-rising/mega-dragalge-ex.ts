import { CardTag, CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { PokemonCard, PlayerType, StateUtils, StoreLike, State } from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';

export class MegaDragalgeex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Skrelp';
  protected _tags = [CardTag.POKEMON_ex, CardTag.POKEMON_SV_MEGA];
  public hp: number = 330;
  public cardType: CardType[] = [N];
  public weakness: { type: CardType }[] = [];
  public resistance: { type: CardType; value: number }[] = [];
  public retreat = [C, C];
  public attacks = [
    {
      name: 'Corrosive Liquid',
      cost: [C, C],
      damage: 0,
      text: "Discard all Pokémon Tool cards and Special Energy from all of your opponent's Pokémon.",
    },
    {
      name: 'Pernicious Poison',
      cost: [W, D],
      damage: 0,
      text: "Your opponent's Active Pokémon is now Poisoned. During Pokémon Checkup, put 16 damage counters on that Pokémon instead of 1.",
    },
  ];
  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '65';
  public name: string = 'Mega Dragalge ex';
  public fullName: string = 'Mega Dragalge ex M4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        [...cardList.tools].forEach((t) => MOVE_CARDS(store, state, cardList, opponent.discard, { cards: [t], sourceCard: this }));
        const specialEnergy = cardList.cards.filter(
          (c) => c instanceof EnergyCard && c.energyType === EnergyType.SPECIAL,
        );
        specialEnergy.forEach((e) => MOVE_CARDS(store, state, cardList, opponent.discard, { cards: [e], sourceCard: this }));
      });
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
      opponent.active.poisonDamage = 160;
    }
    return state;
  }
}
