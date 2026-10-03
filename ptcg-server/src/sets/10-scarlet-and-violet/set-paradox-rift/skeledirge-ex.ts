import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  EnergyType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameError,
  GameMessage,
  PowerType,
  EnergyCard,
  StateUtils,
} from '../../../game';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import {
  AfterDamageEffect,
  ApplyWeaknessEffect,
  PutDamageEffect,
} from '../../../game/store/effects/attack-effects';
import {ABILITY_USED,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Skeledirgeex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Crocalor';
  protected _tags = [CardTag.POKEMON_ex, CardTag.POKEMON_TERA];
  public cardType: CardType[] = [M];
  public hp: number = 330;
  public retreat = [C, C, C];
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];

  public powers = [
    {
      name: 'Incendiary Song',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: "Once during your turn, you may discard a Basic [R] Energy card from your hand in order to use this Ability. During this turn, attacks used by your Pokémon do 60 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).",
    },
  ];

  public attacks = [
    {
      name: 'Luster Burn',
      cost: [R, R],
      damage: 160,
      shredAttack: true,
      text: "This attack's damage isn't affected by any effects on your opponent's Active Pokémon.",
    },
  ];

  public regulationMark = 'H';
  public set: string = 'PAR';
  public name: string = 'Skeledirge ex';
  public fullName: string = 'Skeledirge ex PAR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '137';

  public readonly INCENDIARY_SONG_MARKER = 'INCENDIARY_SONG_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergyInHand = player.hand.cards.some((c) => {
        return c instanceof EnergyCard && c.name === 'Fire Energy';
      });

      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.INCENDIARY_SONG_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          if (!selected || selected.length === 0) {
            return state;
          }

          const card = selected[0];
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: [card], sourceCard: this });
          player.marker.addMarker(this.INCENDIARY_SONG_MARKER, this);
          ABILITY_USED(player, this);
        },
      );
    }

    if (
      effect instanceof AttackEffect &&
      HAS_MARKER(this.INCENDIARY_SONG_MARKER, effect.player, this)
    ) {
      if (effect.damage > 0) {
        effect.damage += 60;
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const applyWeakness = new ApplyWeaknessEffect(effect, 160);
      store.reduceEffect(state, applyWeakness);
      const damage = applyWeakness.damage;

      effect.damage = 0;

      if (damage > 0) {
        opponent.active.damage += damage;
        const afterDamage = new AfterDamageEffect(effect, damage);
        state = store.reduceEffect(state, afterDamage);
      }
    }

    if (
      effect instanceof PutDamageEffect &&
      effect.target.cards.includes(this) &&
      effect.target.getPokemonCard() === this
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Target is not Active
      if (effect.target === player.active || effect.target === opponent.active) {
        return state;
      }

      effect.preventDefault = true;
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.INCENDIARY_SONG_MARKER, this);

    return state;
  }
}
