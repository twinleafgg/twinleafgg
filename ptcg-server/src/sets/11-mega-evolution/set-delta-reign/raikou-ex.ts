
import { PokemonCard, Stage, CardTag, CardType, StoreLike, State, AttachEnergyPrompt, GameMessage, PlayerType, SlotType, SuperType, EnergyType, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Raikouex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [L];
  public hp: number = 200;
  public weakness = [{ type: F }];
  public retreat = [];

  public attacks = [{
      name: 'Thunder-Clad',
      cost: [L],
      damage: 0,
      canUseOnFirstTurn: true,
      text: 'If you go first, you can use this attack during your first turn. Search your deck for an Energy card and attach it to this Pokémon. Then, shuffle your deck.',
    },
    {
      name: 'Power Rush',
      cost: [L, L, C],
      damage: 200,
      text: "Flip a coin. If tails, during your next turn, this Pokémon can't use attacks.",
    }];

  public regulationMark: string = 'J';

  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '33';
  public name: string = 'Raikou ex';
  public fullName: string = 'Raikou ex M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Gather Lightning
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
          { allowCancel: false, min: 0, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];

          if (transfers.length === 0) {
            SHUFFLE_DECK(store, state, player);
            return state;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, {
              cards: [transfer.card],
              sourceCard: this,
            });
          }

          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    // Power Rush
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, (result) => {
        if (!result) {
          effect.player.active.cannotAttackNextTurnPending = true;
        }
      });
    }

    return state;
  }
}
