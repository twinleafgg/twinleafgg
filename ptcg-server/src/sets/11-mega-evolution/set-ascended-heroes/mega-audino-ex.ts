import {
  PokemonCard,
  Stage,
  CardTag,
  CardType,
  StoreLike,
  State,
  GameMessage,
  AttachEnergyPrompt,
  PlayerType,
  SlotType,
  SuperType,
  EnergyType,
  StateUtils,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED,
  SHUFFLE_DECK,
  MULTIPLE_COIN_FLIPS_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MegaAudinoex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [C];
  public hp: number = 270;
  public weakness = [{ type: F }];
  public resistance = [];
  public retreat = [C];

  public attacks = [
    {
      name: 'Kaleidowaltz',
      cost: [C],
      damage: 0,
      text: 'Flip 3 coins. For each heads, search your deck for up to 2 Basic Energy cards and attach them to your Pokémon in any way you like. Then, shuffle your deck.',
    },
    {
      name: 'Ear Force',
      cost: [C, C, C],
      damage: 20,
      damageCalculation: '+',
      text: "This attack does 80 more damage for each Energy attached to your opponent's Active Pokémon.",
    },
  ];

  public regulationMark: string = 'I';

  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '172';
  public name: string = 'Mega Audino ex';
  public fullName: string = 'Mega Audino ex MC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Kaleidowaltz
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, (results) => {
        const headsCount = results.filter((r) => r).length;
        const energyToAttach = headsCount * 2;

        if (energyToAttach > 0) {
          return store.prompt(
            state,
            new AttachEnergyPrompt(
              player.id,
              GameMessage.ATTACH_ENERGY_CARDS,
              player.deck,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.ACTIVE, SlotType.BENCH],
              { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
              { allowCancel: false, min: 0, max: energyToAttach },
            ),
            (transfers) => {
              transfers = transfers || [];
              if (transfers.length > 0) {
                for (const transfer of transfers) {
                  const target = StateUtils.getTarget(state, player, transfer.to);
                  MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
                }
              }
              SHUFFLE_DECK(store, state, player);
            },
          );
        } else {
          SHUFFLE_DECK(store, state, player);
        }
      });
    }

    // Ear Force
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const opponentProvidedEnergy = new CheckProvidedEnergyEffect(opponent);
      store.reduceEffect(state, opponentProvidedEnergy);
      const opponentEnergyCount = opponentProvidedEnergy.energyMap.reduce(
        (left, p) => left + p.provides.length,
        0,
      );

      effect.damage += opponentEnergyCount * 80;
    }

    return state;
  }
}
