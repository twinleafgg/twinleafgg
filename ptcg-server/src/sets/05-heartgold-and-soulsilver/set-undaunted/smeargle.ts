import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, StateUtils, PokemonCardList, GameError, GameMessage, ChooseCardsPrompt, TrainerCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect, TrainerEffect } from '../../../game/store/effects/play-card-effects';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { WAS_ATTACK_USED, WAS_POWER_USED, MULTIPLE_COIN_FLIPS_PROMPT } from '../../../game/store/prefabs/prefabs';

export class Smeargle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Portrait',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if Smeargle is your ' +
    'Active Pokemon, you may look at your opponent\'s hand. If you do, ' +
    'choose a Support card you find there and use the effect of that card ' +
    'as the effect of this power. This power can\'t be used if Smeargle ' +
    'is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Tail Rap',
    cost: [C, C],
    damage: 20,
    text: 'Flip 2 coins. This attack does 20 damage times the number of heads.'
  }];

  public set: string = 'UD';
  public name: string = 'Smeargle';
  public fullName: string = 'Smeargle UD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';

  public readonly PORTRAIT_MARKER: string = 'PORTRAIT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.PORTRAIT_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;

      if (cardList.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (cardList !== player.active) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (player.marker.hasMarker(this.PORTRAIT_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      player.marker.addMarker(this.PORTRAIT_MARKER, this);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_COPY_EFFECT,
        opponent.hand,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { allowCancel: true, min: 1, max: 1 }
      ), cards => {
        if (cards === null || cards.length === 0) {
          return;
        }
        const trainerCard = cards[0] as TrainerCard;
        // Copy as a Poké-Power effect — do not spend this turn's Supporter.
        const originalSupporterTurn = player.supporterTurn;
        player.supporterTurn = 0;
        try {
          store.reduceEffect(state, new TrainerEffect(player, trainerCard));
        } finally {
          player.supporterTurn = originalSupporterTurn;
          if (player.supporter.cards.includes(trainerCard)) {
            player.supporter.moveCardTo(trainerCard, opponent.hand);
          }
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        let heads: number = 0;
        results.forEach(r => { heads += r ? 1 : 0; });
        effect.damage = 20 * heads;
      });
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.PORTRAIT_MARKER, this)) {
      effect.player.marker.removeMarker(this.PORTRAIT_MARKER, this);
    }

    return state;
  }

}
