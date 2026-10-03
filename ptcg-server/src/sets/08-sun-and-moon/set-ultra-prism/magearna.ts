import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, GameError, GameMessage, PlayerType, ChoosePokemonPrompt, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Magearna extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 90;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public readonly CHANGE_CLOTHES_MARKER = 'MAGEARNA_UPR_CHANGE_CLOTHES_MARKER';

  public powers = [{
    name: 'Change Clothes',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may put a Pokémon Tool card attached to 1 of your Pokémon into your hand.'
  }];

  public attacks = [
    {
      name: 'Rolling Attack',
      cost: [M, C, C],
      damage: 60,
      text: ''
    }
  ];

  public set: string = 'UPR';
  public setNumber: string = '91';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Magearna';
  public fullName: string = 'Magearna UPR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Change Clothes
    // Ref: set-fates-collide/genesect-ex.ts (Drive Change - tool to hand)
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      // Check if any of your Pokemon have a tool attached
      let hasToolPokemon = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList.tools.length > 0) {
          hasToolPokemon = true;
        }
      });

      if (!hasToolPokemon) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.CHANGE_CLOTHES_MARKER, this);
      ABILITY_USED(player, this);

      // Choose a Pokemon with a tool
      store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected[0];
        if (target.tools.length > 0) {
          const tool = target.tools[0];
          MOVE_CARDS(store, state, target, player.hand, { cards: [tool], sourceCard: this });
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.CHANGE_CLOTHES_MARKER, this);

    return state;
  }
}
