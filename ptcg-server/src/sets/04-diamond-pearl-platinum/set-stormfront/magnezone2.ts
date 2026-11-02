import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { SuperType } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { ConfirmPrompt } from '../../../game';
import { EnergyCard } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED } from '../../../game/store/prefabs/prefabs';
import { BLOCK_IF_HAS_SPECIAL_CONDITION } from '../../../game/store/prefabs/prefabs';
import { IS_POKEPOWER_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { REMOVE_MARKER_AT_END_OF_TURN } from '../../../game/store/prefabs/prefabs';
import { SWITCH_ACTIVE_WITH_BENCHED } from '../../../game/store/prefabs/prefabs';
import { USE_ABILITY_ONCE_PER_TURN } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Magnezone2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Magneton';
  public hp: number = 120;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +30 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    // Super Connectivity
    name: 'Super Connectivity',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may search your discard pile for a Lightning or Metal Energy card and attach it to your Active Pokémon. Then, put 1 damage counter on that Pokémon. This power can\'t be used if Magnezone is affected by a Special Condition.'
  }];

  public attacks = [{
    // Gyro Ball
    name: 'Gyro Ball',
    cost: [L, C, C],
    damage: 60,
    text: 'You may switch Magnezone with 1 of your Benched Pokémon. If you do, your opponent switches the Defending Pokémon with 1 of his or her Benched Pokémon.'
  }];

  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Magnezone';
  public fullName: string = 'Magnezone SF2';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Super Connectivity
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const blocked: number[] = [];
      player.discard.cards.forEach((card, index) => {
        if (!(card instanceof EnergyCard) || (!card.provides.includes(L) && !card.provides.includes(M))) {
          blocked.push(index);
        }
      });
      if (blocked.length === player.discard.cards.length) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.ATTACH_ENERGY_TO_ACTIVE,
        player.discard,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.discard, player.active, { cards, sourceCard: this });
          player.active.damage += 10;
        }
      });
    }

    // Gyro Ball
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (!hasBench) {
        return state;
      }
      return store.prompt(state, new ConfirmPrompt(player.id, GameMessage.WANT_TO_SWITCH_POKEMON), wantToSwitch => {
        if (wantToSwitch) {
          SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
          SWITCH_ACTIVE_WITH_BENCHED(store, state, opponent);
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
