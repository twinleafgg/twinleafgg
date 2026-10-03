import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  ShuffleDeckPrompt,
  GameMessage,
  ConfirmPrompt,
  AttachEnergyPrompt,
  SlotType,
  StateUtils,
  PlayerType,
  CardTarget,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {AFTER_ATTACK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MewV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V, CardTag.FUSION_STRIKE];

  public regulationMark = 'E';

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 180;

  public weakness = [{ type: CardType.DARK }];

  public retreat = [];

  public attacks = [
    {
      name: 'Energy Mix',
      cost: [CardType.PSYCHIC],
      damage: 0,
      text:
        'Search your deck for an Energy card and attach it to 1 of  ' +
        'your Fusion Strike Pokémon. Then, shuffle your deck.',
    },
    {
      name: 'Psychic Leap',
      cost: [CardType.PSYCHIC, CardType.COLORLESS],
      damage: 70,
      text: 'You may shuffle this Pokémon and all attached cards into your deck.',
    },
  ];

  public set: string = 'FST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '113';

  public name: string = 'Mew V';

  public fullName: string = 'Mew V FST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // let fusionStrikePokemon: PokemonCard | null = null;
      // player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
      //   if (card.hasTag(CardTag.FUSION_STRIKE)) {
      //     fusionStrikePokemon = card;
      //   }
      // });

      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (!cardList.getPokemons().some((c) => c.hasTag(CardTag.FUSION_STRIKE))) {
          blocked.push(target);
        }
      });

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { min: 0, max: 1, allowCancel: false, blockedTo: blocked },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          }
          return state;
        },
      );
    }

    if (AFTER_ATTACK(effect, 1, this)) {
      const player = effect.player;

      return store.prompt(
        state,
        new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            MOVE_CARDS(store, state, player.active, player.deck, { sourceCard: this });
            player.active.clearEffects();

            return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
              player.deck.applyOrder(order);
              return state;
            });
          } else {
            return state;
          }
        },
      );
    }
    return state;
  }
}
