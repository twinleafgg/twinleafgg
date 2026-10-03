import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, AttachEnergyPrompt, GameMessage, PlayerType, SlotType, StateUtils, ShuffleDeckPrompt, GameError } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {COIN_FLIP_PROMPT, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Altaria extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Swablu';
  public cardType: CardType[] = [N];
  public hp: number = 120;
  public retreat = [C];

  public attacks = [{
    name: 'Humming Charge',
    cost: [W],
    damage: 0,
    text: 'Search your deck for up to 2 Basic Energy cards and attach them to your Pokémon in any way you like. Shuffle your deck afterwards.'
  }, {
    name: 'Cotton Wing',
    cost: [W, M],
    damage: 100,
    text: 'Flip a coin. If heads, during your opponent\'s next turn, prevent all damage done to this Pokémon.'
  }];

  public set: string = 'SSP';

  public regulationMark: string = 'H';

  public setNumber: string = '134';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Altaria';
  public fullName: string = 'Altaria SSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Humming Charge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.deck,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { allowCancel: false, min: 0, max: 2 },
      ), transfers => {
        transfers = transfers || [];
        if (transfers.length === 0) {
          SHUFFLE_DECK(store, state, player);
          return state;
        }
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
        }

        state = store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }

    // Cotton Wing
    // Ref: set-astral-radiance/hisuian-growlithe.ts (Defensive Posture)
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          PREVENT_DAMAGE(store, state, effect, this);
        }
      });
    }

    return state;
  }
}
