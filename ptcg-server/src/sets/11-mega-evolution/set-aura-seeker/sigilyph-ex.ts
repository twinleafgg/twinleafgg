import { PokemonCard, CardTag, Stage, CardType, PowerType, StoreLike, State, StateUtils, GamePhase, AttachEnergyPrompt, GameMessage, PlayerType, SlotType, SuperType } from "../../../game";
import { PutDamageEffect } from "../../../game/store/effects/attack-effects";
import { Effect } from "../../../game/store/effects/effect";
import { AfterAttackEffect } from "../../../game/store/effects/game-phase-effects";
import {IS_ABILITY_BLOCKED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class Sigilyphex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 210;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Mega Protection',
    powerType: PowerType.ABILITY,
    text: 'Prevent all damage done to this Pokémon by attacks from your opponent\'s Mega Evolution Pokémon ex.',
  }];

  public attacks = [{
    name: 'Power Cyclone',
    cost: [C, C, C],
    damage: 140,
    text: 'Move an Energy from this Pokémon to 1 of your Benched Pokémon.',
  }];

  public regulationMark = 'J';
  public set: string = 'FLO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '32';
  public name: string = 'Sigilyph ex';
  public fullName: string = 'Sigilyph ex FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Mega Protection
    if (effect instanceof PutDamageEffect && effect.target.cards.includes(this)) {
      const player = StateUtils.findOwner(state, effect.target);
      const opponent = StateUtils.findOwner(state, effect.source);
      const pokemonCard = effect.target.getPokemonCard();
      const sourceCard = effect.source.getPokemonCard();

      if (pokemonCard !== this || sourceCard === undefined) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (player === opponent) {
        return state;
      }

      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      if (sourceCard.hasTag(CardTag.POKEMON_SV_MEGA) && sourceCard.hasTag(CardTag.POKEMON_ex)) {
        effect.preventDefault = true;
      }
    }

    // Power Cyclone
    if (effect instanceof AfterAttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;
      const hasBench = player.bench.some(b => b.cards.length > 0);

      if (!hasBench) {
        return state;
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.active,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 1, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}
