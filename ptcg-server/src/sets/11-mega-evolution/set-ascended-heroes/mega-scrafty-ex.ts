import {
  CardTag,
  CardType,
  PokemonCard,
  Stage,
  PowerType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { EffectOfAbilityEffect } from '../../../game/store/effects/game-effects';
import { GamePhase } from '../../../game/store/state/state';
import {
  IS_ABILITY_BLOCKED,
  MOVE_CARDS,
  WAS_ATTACK_USED,
} from '../../../game/store/prefabs/prefabs';

export class MegaScraftyex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Scraggy';
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [D];
  public hp: number = 330;
  public weakness = [{ type: G }];
  public resistance = [];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Counterattacking Crest',
      powerType: PowerType.ABILITY,
      text: "If this Pokémon is in the Active Spot and is damaged by an attack from your opponent's Pokémon (even if this Pokémon is Knocked Out), place 5 damage counters on the Attacking Pokémon.",
    },
  ];

  public attacks = [
    {
      name: 'Outlaw Leg',
      cost: [D, D, C],
      damage: 160,
      text: "Discard a random card from your opponent's hand. Discard the top card of your opponent's deck.",
    },
  ];

  public regulationMark: string = 'I';
  public set: string = 'ASC';
  public setNumber: string = '135';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Scrafty ex';
  public fullName: string = 'Mega Scrafty ex M2a';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Counter Crest ability
    if (
      effect instanceof AfterDamageEffect &&
      effect.target.getPokemonCard() === this &&
      state.phase === GamePhase.ATTACK
    ) {
      const player = StateUtils.findOwner(state, effect.target);
      const opponent = effect.player;
      if (player === opponent || player.active !== effect.target) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const damageEffect = new EffectOfAbilityEffect(player, this.powers[0], this, effect.source);
      store.reduceEffect(state, damageEffect);
      if (damageEffect.target) {
        damageEffect.target.damage += 50; // 5 damage counters = 50 damage
      }
    }

    // DDC Outlaw Leg attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Discard a random card from opponent's hand
      if (opponent.hand.cards.length > 0) {
        const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
        const randomCard = opponent.hand.cards[randomIndex];
        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: [randomCard], sourceCard: this });
      }

      // Discard the top card of opponent's deck
      MOVE_CARDS(store, state, opponent.deck, opponent.discard, {
        count: 1,
        sourceCard: this,
        sourceEffect: this.attacks[0],
      });
    }

    return state;
  }
}
