import { CardType, PokemonCard, Stage, StoreLike, State, StateUtils, GameMessage, EnergyCard, GameError, ChooseCardsPrompt, SuperType, SlotType } from '../../../game';
import { PowerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED, ADD_MARKER, ADD_PARALYZED_TO_PLAYER_ACTIVE, HAS_MARKER, THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Ampharos extends PokemonCard {
  public stage = Stage.STAGE_2;
  public evolvesFrom = 'Flaaffy';
  public cardType: CardType[] = [L];
  public hp = 150;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Unseen Flash',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may put 2 [L] Energy cards from your hand in the Lost Zone. If you do, your opponent\'s Active Pokémon is now Paralyzed.'
  }];

  public attacks = [{
    name: 'Split Bomb',
    cost: [L, L],
    damage: 0,
    text: 'This attack does 50 damage to 2 of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set = 'LOT';
  public setNumber: string = '78';
  public cardImage: string = 'assets/cardback.png';
  public name = 'Ampharos';
  public fullName = 'Ampharos LOT';

  public readonly UNSEEN_FLASH_MARKER = 'UNSEEN_FLASH_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const lightningEnergyCount = player.hand.cards.filter(c => {
        return c instanceof EnergyCard && c.name === 'Lightning Energy';
      }).length;

      if (lightningEnergyCount < 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (HAS_MARKER(this.UNSEEN_FLASH_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY, name: 'Lightning Energy' },
        { allowCancel: true, min: 2, max: 2 }
      ), cards => {
        cards = cards || [];

        ADD_PARALYZED_TO_PLAYER_ACTIVE(store, state, opponent, this);
        ADD_MARKER(this.UNSEEN_FLASH_MARKER, player, this);
        ABILITY_USED(player, this);

        MOVE_CARDS(store, state, player.hand, player.lostzone, { cards: cards, sourceCard: this });
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(50, effect, store, state, 2, 2, false, [SlotType.BENCH, SlotType.ACTIVE]);
    }

    return state;
  }

}
