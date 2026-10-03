import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import {
  PokemonCard,
  StoreLike,
  State,
  StateUtils,
  AttachEnergyPrompt,
  GameMessage,
  PlayerType,
  SlotType,
} from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Delibird extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Pleasing Present',
      cost: [C],
      damage: 0,
      text: 'Each player may attach up to 3 Basic Energy cards from their hand to their Pokémon in any way they like. Your opponent does this first.',
    },
    {
      name: 'Flap',
      cost: [C, C],
      damage: 40,
      text: '',
    },
  ];

  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Delibird';
  public fullName: string = 'Delibird M4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      // Ref: set-unified-minds/zygarde.ts (Boost Fang), set-emerging-powers/tornadus.ts (energy move)
      // AttachEnergyPrompt `playerType` is from the prompted player's POV (BOTTOM_PLAYER = their field).
      // TOP_PLAYER here would incorrectly offer the other player's Pokémon in the attach UI.
      return store.prompt(
        state,
        new AttachEnergyPrompt(
          opponent.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          opponent.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { allowCancel: true, min: 0, max: 3 },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, opponent, transfer.to);
            MOVE_CARDS(store, state, opponent.hand, target, { cards: [transfer.card], sourceCard: this });
          }
          store.prompt(
            state,
            new AttachEnergyPrompt(
              player.id,
              GameMessage.ATTACH_ENERGY_CARDS,
              player.hand,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.ACTIVE, SlotType.BENCH],
              { superType: SuperType.ENERGY },
              { allowCancel: true, min: 0, max: 3 },
            ),
            (transfersSelf) => {
              transfersSelf = transfersSelf || [];
              for (const transfer of transfersSelf) {
                const target = StateUtils.getTarget(state, player, transfer.to);
                MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
              }
            },
          );
        },
      );
    }
    return state;
  }
}
