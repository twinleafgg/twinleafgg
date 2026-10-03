import { GameError, GameMessage, PowerType, StateUtils } from '../../../game';
import { CardTag, Stage, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonPowersEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';

import { GamePhase, State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class SkySealStone extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'CRZ';
  public setNumber: string = '143';
  public regulationMark: string = 'F';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Sky Seal Stone';
  public fullName: string = 'Sky Seal Stone CRZ';

  public text: string =
    'The Pokémon V this card is attached to can use the VSTAR Power on this card.';

  public extraPrizes = false;

  public powers = [
    {
      name: 'Star Order',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      exemptFromAbilityLock: true,
      text: "During your turn, you may use this Ability. During this turn, if your opponent's Active Pokémon VSTAR or Active Pokémon VMAX is Knocked Out by damage from an attack from your Basic Pokémon V, take 1 more Prize card. (You can't use more than 1 VSTAR Power in a game.)",
    },
  ];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Add ability to card if attached to a V
    if (
      effect instanceof CheckPokemonPowersEffect &&
      !effect.powers.find((p) => p.name === this.powers[0].name)
    ) {
      // Find the PokemonCardList that contains the target PokemonCard
      const cardList = StateUtils.findCardList(state, effect.target);
      if (cardList instanceof PokemonCardList && cardList.tools.includes(this)) {
        const hasValidCard = effect.target.tags.some(
          (tag) =>
            tag === CardTag.POKEMON_V ||
            tag === CardTag.POKEMON_VSTAR ||
            tag === CardTag.POKEMON_VMAX ||
            tag === CardTag.POKEMON_VUNION,
        );
        if (!hasValidCard) {
          return state;
        }
        effect.powers.push(this.powers[0]);
      }
      return state;
    }

    // Set extraPrizes to true when power is activated
    if (effect instanceof PowerEffect && effect.power === this.powers[0]) {
      const player = effect.player;

      if (player.usedVSTAR === true) {
        throw new GameError(GameMessage.LABEL_VSTAR_USED);
      }
      player.usedVSTAR = true;
      this.extraPrizes = true;

      return state;
    }

    // Check conditions for taking an extra prize upon knockout
    if (effect instanceof KnockOutEffect && effect.target === effect.player.active) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Do not activate between turns, or when it's not opponents turn
      if (state.phase !== GamePhase.ATTACK || state.players[state.activePlayer] !== opponent) {
        return state;
      }

      // Must be basic V, opponent's active must be VSTAR or VMAX
      const attackingPokemon = opponent.active;
      if (
        this.extraPrizes &&
        effect.target === player.active &&
        player.active.cards.some(
          (c) => c.hasTag(CardTag.POKEMON_VMAX) || c.hasTag(CardTag.POKEMON_VSTAR),
        ) &&
        attackingPokemon.getPokemonCard()?.stage === Stage.BASIC &&
        attackingPokemon.vPokemon()
      ) {
        if (effect.prizeCount > 0) {
          effect.prizeCount += 1;
        }
        this.extraPrizes = false;
      }
      return state;
    }

    // Remove extra prize effect on turn end
    if (effect instanceof EndTurnEffect) {
      this.extraPrizes = false;
    }
    return state;
  }
}
