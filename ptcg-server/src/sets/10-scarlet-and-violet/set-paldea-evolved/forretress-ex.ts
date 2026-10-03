import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  EnergyType,
  SuperType,
  CardTag,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PowerType,
  GameMessage,
  PlayerType,
  SlotType,
  AttachEnergyPrompt,
  StateUtils,
  GameError,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {SHUFFLE_DECK, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Forretressex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  protected _tags = [CardTag.POKEMON_ex, CardTag.POKEMON_TERA];
  public evolvesFrom = 'Pineco';
  public cardType: CardType[] = [G];
  public hp: number = 270;
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Exploding Energy',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      knocksOutSelf: true,
      text: 'Once during your turn, you may search your deck for up to 5 Basic [G] Energy cards and attach them to your Pokémon in any way you like. Then, shuffle your deck. If you searched your deck in this way, this Pokémon is Knocked Out.',
    },
  ];

  public attacks = [
    {
      name: 'Guard Press',
      cost: [G, G],
      damage: 120,
      text: "During your opponent's next turn, this Pokémon takes 30 less damage from attacks(after applying Weakness and Resistance).",
    },
  ];

  public regulationMark = 'G';
  public set: string = 'PAL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Forretress ex';
  public fullName: string = 'Forretress ex PAL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Grass Energy' },
          { allowCancel: false, min: 0, max: 5 },
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
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
            SHUFFLE_DECK(store, state, player);
          }
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              cardList.damage += 999;
            }
          });
        },
      );
    }
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.player.active.damageReductionNextTurn = 30;
    }

    if (
      effect instanceof PutDamageEffect &&
      effect.target.cards.includes(this) &&
      effect.target.getPokemonCard() === this
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Target is not Active
      if (effect.target === player.active || effect.target === opponent.active) {
        return state;
      }

      effect.preventDefault = true;
    }
    return state;
  }
}
