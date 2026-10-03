import {
  CardTag,
  CardType,
  ChooseCardsPrompt,
  GameError,
  GameLog,
  GameMessage,
  PokemonCard,
  PokemonCardList,
  Power,
  PowerType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
  Weakness,
} from '../../../game';
import {
  CheckAttackCostEffect,
  CheckProvidedEnergyEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Ditto extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 60;
  public weakness: Weakness[] = [{ type: F }];
  public retreat: CardType[] = [C];

  public powers: Power[] = [
    {
      name: 'Form Variation',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: 'Once during your turn (before your attack), you may search your discard pile for a Basic Pokémon (excluding Pokémon-ex and Ditto) and switch it with Ditto. (Any  cards attached to Ditto, damage counters, Special Conditions, and effects on it are now on the new Pokémon.) Place Ditto in the discard pile.',
    },
  ];

  public attacks = [
    {
      name: 'Energy Ball',
      cost: [C],
      damage: 10,
      text: "Does 10 damage plus 10 more damage for each Energy attached to Ditto but not used to pay for this attack's Energy cost. You can't add more then 20 damage in this way.",
    },
  ];

  public set: string = 'RG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Ditto';
  public fullName: string = 'Ditto RG';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    //Power
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const targetCardList = StateUtils.findCardList(state, this);
      if (!(targetCardList instanceof PokemonCardList)) {
        throw new GameError(GameMessage.INVALID_TARGET);
      }

      let canUse = false;
      const blocked: number[] = [];

      player.discard.cards.forEach((card, index) => {
        if (
          card instanceof PokemonCard &&
          (card.name === 'Ditto' || card.hasTag(CardTag.POKEMON_ex))
        ) {
          blocked.push(index);
        } else if (card instanceof PokemonCard && card.stage === Stage.BASIC) {
          canUse = true;
        }
      });

      if (!canUse) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          player.discard,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 1, max: 1, allowCancel: false, blocked },
        ),
        (selection) => {
          if (selection.length <= 0) {
            throw new GameError(GameMessage.INVALID_TARGET);
          }

          const pokemonCard = selection[0];

          if (!(pokemonCard instanceof PokemonCard)) {
            throw new GameError(GameMessage.INVALID_TARGET);
          }
          store.log(state, GameLog.LOG_PLAYER_TRANSFORMS_INTO_POKEMON, {
            name: player.name,
            pokemon: this.name,
            card: pokemonCard.name,
            effect: effect.power.name,
          });
          MOVE_CARDS(store, state, player.discard, targetCardList, { cards: [pokemonCard], sourceCard: this });
          MOVE_CARDS(store, state, targetCardList, player.discard, { cards: [this], sourceCard: this });
        },
      );
    }

    //Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const checkCost = new CheckAttackCostEffect(player, this.attacks[0]);
      state = store.reduceEffect(state, checkCost);

      const checkEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkEnergy);

      const energy = checkEnergy.energyMap;

      const extraEnergy = energy.length - checkCost.cost.length;

      if (extraEnergy == 1) effect.damage += 10;
      else if (extraEnergy >= 2) effect.damage += 20;
    }

    return state;
  }
}
