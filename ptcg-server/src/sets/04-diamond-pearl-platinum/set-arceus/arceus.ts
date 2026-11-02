import {
  AttachEnergyPrompt,
  GameMessage,
  PlayerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import {
  CardTag,
  CardType,
  EnergyType,
  Stage,
  SuperType,
} from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Arceus extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public retreat = [C];
  protected _tags = [CardTag.ARCEUS];

  public attacks = [
    {
      name: 'Ripple Swell',
      cost: [],
      damage: 0,
      text: 'If you have 6 Arceus in play and each of them is a different type, search your deck for up to 6 basic Energy cards. Attach each of those Energy cards to a different Pokémon you have in play. Shuffle your deck afterward',
    },
    {
      name: 'Sky Spear',
      cost: [C, C, C],
      damage: 0,
      text: "Choose 1 of your opponent's Pokémon. This attack does 80 damage to that Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.) Remove all Energy cards attached to Arceus and put them in the Lost Zone",
    },
  ];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'AR5';
  public name: string = 'Arceus';
  public fullName: string = 'Arceus AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ripple Swell
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const types = new Set<string>();
      let arceusInPlay = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, list => {
        const card = list.getPokemonCard();
        if (card?.name === 'Arceus') {
          arceusInPlay++;
          card.cardType.forEach(t => types.add(String(t)));
        }
      });

      if (arceusInPlay !== 6 || types.size !== 6) {
        return state;
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 0, max: 6, differentTargets: true },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            SHUFFLE_DECK(store, state, player);
            return state;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, {
              cards: [transfer.card],
              sourceCard: this,
              sourceEffect: this.attacks[0],
            });
          }
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    // Sky Spear
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(80, effect, store, state);

      const energies = player.active.cards.filter((card) => card.superType === SuperType.ENERGY);
      MOVE_CARDS(store, state, player.active, player.lostzone, { cards: energies });
    }

    return state;
  }
}
