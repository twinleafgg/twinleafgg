import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  EnergyType,
} from '../../../game/store/card/card-types';
import { PowerType,
  StoreLike,
  State,
  GameMessage,
  PlayerType,
  AttachEnergyPrompt,
  EnergyCard,
  SlotType,
  StateUtils,
  CardTarget,
  GameError, pokemonHasCardType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

export class Koraidonex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 230;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Dino Cry',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, you may attach up to 2 Basic [F] Energy cards from your discard pile to your Basic [F] Pokémon in any way you like. If you use this Ability, your turn ends.',
    },
  ];

  public attacks = [
    {
      name: 'Wild Impact',
      cost: [F, F, C],
      damage: 220,
      text: "During your next turn, this Pokémon can't attack.",
    },
  ];

  public regulationMark = 'G';
  public set: string = 'SVI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '125';
  public name: string = 'Koraidon ex';
  public fullName: string = 'Koraidon ex SVI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Wild Impact
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      player.active.cannotAttackNextTurnPending = true;
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return (
          c.superType === SuperType.ENERGY &&
          c.energyType === EnergyType.BASIC &&
          (c as EnergyCard).provides.includes(CardType.FIGHTING)
        );
      });

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // let fightingPokemonOnBench = false;

      // player.bench.forEach(benchSpot => {
      //   const card = benchSpot.getPokemonCard();
      //   if (card && pokemonHasCardType(card, CardType.FIGHTING) && card.stage === Stage.BASIC) {
      //     fightingPokemonOnBench = true;
      //   }
      // });

      // if (!fightingPokemonOnBench) {
      //   throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      // }

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (!pokemonHasCardType(card, CardType.FIGHTING)) {
          blocked2.push(target);
        }
        if (card.stage !== Stage.BASIC) {
          blocked2.push(target);
        }
      });

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
          { allowCancel: false, min: 1, max: 2, blockedTo: blocked2 },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            return;
          }
          transfers.forEach((transfer) => {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          });
        },
      );
      const endTurnEffect = new EndTurnEffect(player);
      store.reduceEffect(state, endTurnEffect);
      return state;
    }

    return state;
  }
}
