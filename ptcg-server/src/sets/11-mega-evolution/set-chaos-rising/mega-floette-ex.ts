import {
  AttachEnergyPrompt,
  CardTag,
  CardType,
  EnergyType,
  GameMessage,
  PlayerType,
  PokemonCard,
  PokemonCardList,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MegaFloetteex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [P];
  public hp: number = 250;
  public weakness = [{ type: M }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Gentle Light',
      cost: [P],
      damage: 0,
      text: "Heal 30 damage from each Pokémon (both yours and your opponent's).",
    },
    {
      name: 'Eternity Bloom',
      cost: [P, P, P],
      damage: 200,
      text: 'Search your deck for up to 4 Basic [P] Energy cards and attach them to your Benched Pokémon in any way you like. Then, shuffle your deck.',
    },
  ];

  public regulationMark: string = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '35';
  public name: string = 'Mega Floette ex';
  public fullName: string = 'Mega Floette ex M4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const targets: PokemonCardList[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList.damage > 0) {
          targets.push(cardList);
        }
      });
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList.damage > 0) {
          targets.push(cardList);
        }
      });

      if (targets.length > 0) {
        targets.forEach((target) => {
          const healEffect = new HealEffect(player, target, 30);
          store.reduceEffect(state, healEffect);
        });
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Psychic Energy' },
          { allowCancel: false, min: 0, max: 4 },
        ),
        (transfers) => {
          transfers = transfers || [];
          if (transfers.length === 0) {
            return SHUFFLE_DECK(store, state, player);
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          }
          return SHUFFLE_DECK(store, state, player);
        },
      );
    }

    return state;
  }
}
