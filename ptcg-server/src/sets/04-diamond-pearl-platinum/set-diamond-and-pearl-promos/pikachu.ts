import { ChooseCardsPrompt } from '../../../game';
import { EnergyCard } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { PokemonCardList } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { EnergyType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { ABILITY_USED } from '../../../game/store/prefabs/prefabs';
import { BLOCK_IF_HAS_SPECIAL_CONDITION } from '../../../game/store/prefabs/prefabs';
import { IS_POKEPOWER_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { REMOVE_MARKER_AT_END_OF_TURN } from '../../../game/store/prefabs/prefabs';
import { SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { USE_ABILITY_ONCE_PER_TURN } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Pikachu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Electro Recycle',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), if Pichu is anywhere under Pikachu, you may search your discard pile for a Lightning Energy card, show it to your opponent, and put it into your hand. This power can\'t be used if Pikachu is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'BikaBika',
    cost: [L, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 damage plus 10 more damage.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP16';
  public name: string = 'Pikachu';
  public fullName: string = 'Pikachu DPP';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Electro Recycle
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      const hasPichu = cardList.getPokemons().some(p => p.name === 'Pichu');
      if (!hasPichu) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      const hasLightning = player.discard.cards.some(c =>
        c instanceof EnergyCard
        && c.energyType === EnergyType.BASIC
        && c.provides.includes(CardType.LIGHTNING)
      );
      if (!hasLightning) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length === 0) {
          return;
        }
        SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
        MOVE_CARDS(store, state, player.discard, player.hand, { cards, sourceCard: this });
      });
    }

    // BikaBika
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 10);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
