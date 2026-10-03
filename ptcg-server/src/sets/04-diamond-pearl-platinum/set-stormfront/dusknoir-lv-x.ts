import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, GameError, GameMessage, StateUtils, PokemonCardList, GamePhase } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { PlayStadiumEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class DusknoirLvX extends PokemonCard {

  public stage: Stage = Stage.LV_X;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 300;

  public weakness = [{ type: CardType.PSYCHIC, value: 10 }];

  public retreat = [];

  public powers = [{
    name: 'Quick',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'If Dusknoir is your Active Pokémon and would be Knocked Out by damage from your opponent\'s attack, you may discard all cards attached to Dusknoir LV.X and put Dusknoir LV.X as a Stadium card into play instead of discarding it. This counts as Dusknoir being Knocked Out and your opponent takes a Prize card. As long as you have Dusknoir LV.X as a Stadium card in play, put 1 damage counter on each of your opponent\'s Pokémon between turns. If another Stadium card comes into play or Dusknoir LV.X is discarded by the effects of any attacks, Poké-Powers, Poké-Bodies, Trainer, or Supporter cards, return Dusknoir LV.X to your hand.'
  }];

  public set: string = 'SF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '96';

  public name: string = 'Dusknoir';

  public fullName: string = 'DusknLv.X SF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = (effect as PowerEffect).player;
      const cardList = StateUtils.findCardList(state, this);

      // check if UnownR is on player's Bench
      const benchIndex = player.bench.indexOf(cardList as PokemonCardList);
      if (benchIndex === -1) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      player.bench[benchIndex].clearEffects();

      effect instanceof PlayStadiumEffect && effect.card == this; {
        // MOVE_CARDS(store, state, player.bench[benchIndex], player.stadium, { sourceCard: this });

        if (state.phase == GamePhase.ATTACK) {
          const opponent = StateUtils.getOpponent(state, player);
          opponent.active.damage += 10;
          opponent.bench.forEach(b => b.damage += 10);
        }
        if (effect instanceof PlayStadiumEffect && effect.card !== this) {
          MOVE_CARDS(store, state, effect.player.stadium, effect.player.hand, { sourceCard: this });

          return state;
        }
        return state;
      }
      return state;
    }
    return state;
  }
}

