import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, CardTag } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  SlotType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COPY_ATTACK_VIA_ABILITY } from '../../../game/store/prefabs/copy-attack-prefabs';
import { WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MewEx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_EX];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 120;

  public weakness = [{ type: CardType.PSYCHIC }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Versatile',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text:
        'This Pokemon can use the attacks of any Pokemon in play ' +
        "(both yours and your opponent's). (You still need the necessary " +
        'Energy to use each attack.)',
    },
  ];

  public attacks = [
    {
      name: 'Replace',
      cost: [CardType.PSYCHIC],
      damage: 0,
      text:
        'Move as many Energy attached to your Pokemon to your other ' +
        'Pokemon in any way you like.',
    },
  ];

  public set: string = 'LTR';

  public name: string = 'Mew-EX';

  public fullName: string = 'Mew EX LTR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = 'RC24';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      return COPY_ATTACK_VIA_ABILITY(store, state, effect, {
        copycatCard: this,
        includeOpponent: true,
        filter: (_cardList, card) => !(card instanceof MewEx),
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          effect.player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { allowCancel: true },
        ),
        (transfers) => {
          if (transfers === null) {
            return;
          }

          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    return state;
  }
}
