import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, PowerType, EnergyCard, AttachEnergyPrompt, GameMessage, PlayerType, SlotType, ConfirmPrompt, GameLog } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Togekiss extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Togetic';
  public cardType: CardType[] = [P];
  public hp: number = 150;
  public weakness = [{ type: M }];
  public retreat = [];

  public powers = [{
    name: 'Precious Gift',
    powerType: PowerType.ABILITY,
    text: 'Once at the end of your turn (after your attack), you may use this Ability. Draw cards until you have 8 cards in your hand.'
  }];

  public attacks = [{
    name: 'Power Cyclone',
    cost: [C, C],
    damage: 110,
    text: 'Move an Energy from this Pokémon to 1 of your Benched Pokémon.'
  }];

  public set: string = 'OBF';
  public regulationMark = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';
  public name: string = 'Togekiss';
  public fullName: string = 'Togekiss OBF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Precious Gift
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;

      let isTogekissInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          isTogekissInPlay = true;
        }
      });

      if (!isTogekissInPlay) {
        return state;
      }

      try {
        const powerEffect = new PowerEffect(player, this.powers[0], this);
        store.reduceEffect(state, powerEffect);
      } catch {
        return state;
      }

      if (player.hand.cards.length >= 8) {
        return state;
      }

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          store.log(state, GameLog.LOG_PLAYER_USES_ABILITY, { name: player.name, card: 'Togekiss' });

          while (player.hand.cards.length < 8 && player.deck.cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
          }
        }
      });
    }

    // Power Cyclone
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasBench = player.bench.some(b => b.cards.length > 0);

      const hasEnergy = player.active.cards.some(c => {
        return c instanceof EnergyCard;
      });

      if (hasBench === false || hasEnergy === false) {
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
