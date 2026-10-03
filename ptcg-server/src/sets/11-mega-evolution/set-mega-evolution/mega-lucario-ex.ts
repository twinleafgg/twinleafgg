import {
  AttachEnergyPrompt,
  CardTag,
  CardType,
  EnergyType,
  GameMessage,
  PlayerType,
  PokemonCard,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MegaLucarioex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Riolu';
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [F];
  public hp: number = 340;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Aura Jab',
      cost: [F],
      damage: 130,
      text: 'Attach up to 3 Basic [F] Energy cards from your discard pile to your Benched Pokemon in any way you like.',
    },
    {
      name: 'Mega Brave',
      cost: [F, F],
      damage: 270,
      text: "During your next turn, this Pokémon can't use Mega Brave.",
    },
  ];

  public regulationMark: string = 'I';
  public set: string = 'MEG';
  public setNumber: string = '77';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Lucario ex';
  public fullName: string = 'Mega Lucario ex M1L';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Aura Jab
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
          { allowCancel: false, min: 0, max: 3 },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            return state;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    // Mega Brave
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      if (!player.active.cannotUseAttacksNextTurnPending.includes('Mega Brave')) {
        player.active.cannotUseAttacksNextTurnPending.push('Mega Brave');
      }
    }
    return state;
  }
}
