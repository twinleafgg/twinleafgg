import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  EnergyType,
} from '../../../game/store/card/card-types';
import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {THIS_ATTACK_DOES_X_MORE_DAMAGE,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';

export class Machamp extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Machoke';
  protected _tags = [CardTag.PRIME];
  public cardType: CardType[] = [F];
  public hp: number = 150;
  public weakness = [{ type: P }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Fighting Tag',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: 'Once during your turn (before your attack), if Machamp is on your Bench, you may move all [F] Energy attached to your Active Pokémon to Machamp. If you do, switch Machamp with your Active Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Crushing Punch',
      cost: [F, C, C],
      damage: 60,
      text: 'Discard a Special Energy card attached to the Defending Pokémon.',
    },
    {
      name: 'Champ Buster',
      cost: [F, F, C, C],
      damage: 100,
      damageCalculation: '+',
      text: 'Does 100 damage plus 10 more damage for each of your Benched Pokémon that has any damage counters on it.',
    },
  ];

  public set: string = 'TM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Machamp';
  public fullName: string = 'Machamp TM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const source = player.active;

      if (player.active.getPokemonCard() === this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      state = store.reduceEffect(state, checkProvidedEnergy);

      if (
        checkProvidedEnergy.energyMap.filter(
          (energyMap) =>
            energyMap.provides.includes(CardType.FIGHTING) ||
            energyMap.provides.includes(CardType.ANY),
        ).length === 0
      ) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Move all [F] and [ANY] energy from Active to this Benched Machamp, then switch
      // Find the Machamp on the bench (the one using the power)
      const machampBenchIndex = player.bench.findIndex(
        (benchSlot) => benchSlot.getPokemonCard() === this,
      );
      if (machampBenchIndex === -1) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      const machampBenchSlot = player.bench[machampBenchIndex];

      // Only move cards that provide FIGHTING or ANY
      const cardsToMove = checkProvidedEnergy.energyMap
        .filter(
          (energyMap) =>
            energyMap.provides.includes(CardType.FIGHTING) ||
            energyMap.provides.includes(CardType.ANY),
        )
        .map((energyMap) => energyMap.card);

      // Remove the cards from the active and add to Machamp on the bench
      cardsToMove.forEach((transfer) => {
        MOVE_CARDS(store, state, source, machampBenchSlot, { cards: [transfer], sourceCard: this });
      });

      player.switchPokemon(player.bench[machampBenchIndex]);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const activeCardList = opponent.active;
      const activePokemonCard = activeCardList.getPokemonCard();

      let hasPokemonWithEnergy = false;

      if (
        activePokemonCard &&
        activeCardList.energies.cards.some(
          (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.SPECIAL,
        )
      ) {
        hasPokemonWithEnergy = true;
      }

      if (!hasPokemonWithEnergy) {
        return state;
      }

      let cards: Card[] = [];
      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.active,
          { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
        },
      );
      const discardEnergy = new DiscardCardsEffect(effect, cards);
      return store.reduceEffect(state, discardEnergy);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      //I check how many Pokémon are on the bench to know how much damage the attack will cause.
      const player = effect.player;
      const hasBenched = player.bench.some((b) => b.cards.length > 0);

      if (!hasBenched) {
        return state;
      }

      let benchPokemonWithDamage = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList === player.active) {
          return;
        }
        if (cardList.damage !== 0) {
          benchPokemonWithDamage++;
        }
      });
      THIS_ATTACK_DOES_X_MORE_DAMAGE(effect, store, state, 10 * benchPokemonWithDamage);
    }

    return state;
  }
}
