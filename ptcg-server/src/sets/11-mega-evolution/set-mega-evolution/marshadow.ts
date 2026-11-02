import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { GamePhase, PlayerType, StateUtils, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AbstractAttackEffect } from '../../../game/store/effects/attack-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Marshadow extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 90;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    name: 'Shadowy Side Kick',
    cost: [F, F],
    damage: 60,
    text: 'If your opponent\'s Pokémon is Knocked Out by damage from this attack, during your opponent\'s next turn, prevent all damage from and effects of attacks done to this Pokémon.'
  }];

  public set: string = 'MEG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '80';
  public name: string = 'Marshadow';
  public fullName: string = 'Marshadow M1L';
  public regulationMark = 'I';

  private readonly PREVENT_ALL_DAMAGE_AND_EFFECTS = 'PREVENT_ALL_DAMAGE_AND_EFFECTS';
  private readonly CLEAR_PREVENT_ALL_DAMAGE_AND_EFFECTS = 'CLEAR_PREVENT_ALL_DAMAGE_AND_EFFECTS';

  private usedShadowySideKick = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack: Shadowy Side Kick
    // Ref: set-plasma-freeze/kakuna.ts (prevent damage/effects), set-crimson-invasion/guzzlord-gx.ts (KO-conditional flag)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedShadowySideKick = true;
    }

    // If opponent's Pokemon KO'd by this attack, add prevention marker
    if (effect instanceof KnockOutEffect && this.usedShadowySideKick) {
      const koOwner = effect.player;
      const attacker = StateUtils.getOpponent(state, koOwner);

      if (
        state.phase === GamePhase.ATTACK
        && attacker.active.cards.includes(this)
        && koOwner.marker.hasMarker(koOwner.DAMAGE_DEALT_MARKER)
      ) {
        attacker.active.marker.addMarker(this.PREVENT_ALL_DAMAGE_AND_EFFECTS, this);
        koOwner.marker.addMarker(this.CLEAR_PREVENT_ALL_DAMAGE_AND_EFFECTS, this);
      }
      this.usedShadowySideKick = false;
    }

    // Prevent damage and effects when marker is set
    // Ref: set-cosmic-eclipse/alolan-persian-gx.ts (Smug Face - AbstractAttackEffect for all effects)
    if (effect instanceof AbstractAttackEffect
      && effect.target.cards.includes(this)
      && effect.target.marker.hasMarker(this.PREVENT_ALL_DAMAGE_AND_EFFECTS, this)) {
      effect.preventDefault = true;
      return state;
    }

    // Cleanup at end of opponent's turn
    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.CLEAR_PREVENT_ALL_DAMAGE_AND_EFFECTS, this)) {
      effect.player.marker.removeMarker(this.CLEAR_PREVENT_ALL_DAMAGE_AND_EFFECTS, this);
      const opponent = StateUtils.getOpponent(state, effect.player);
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        cardList.marker.removeMarker(this.PREVENT_ALL_DAMAGE_AND_EFFECTS, this);
      });
    }

    // Reset flag at end of turn
    if (effect instanceof EndTurnEffect) {
      this.usedShadowySideKick = false;
    }

    return state;
  }
}
