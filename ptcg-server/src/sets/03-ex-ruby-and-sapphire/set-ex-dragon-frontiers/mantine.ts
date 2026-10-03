import {
  ChooseCardsPrompt,
  ConfirmPrompt,
  GameError,
  GameMessage,
  PlayerType,
  ShowCardsPrompt,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import {
  BoardEffect,
  CardTag,
  CardType,
  EnergyType,
  Stage,
  SuperType,
} from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import {
  ADD_MARKER,
  HAS_MARKER,
  IS_POKEPOWER_BLOCKED,
  MOVE_CARDS,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';

export class Mantine extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES];
  public cardType: CardType[] = [L];
  public hp: number = 50;
  public weakness = [{ type: L }];
  public retreat = [C];

  public powers = [
    {
      name: 'Power Circulation',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn (before your attack), you may search your discard pile for a basic Energy card, show it to your opponent, and put it on top of your deck. If you do, put 1 damage counter on Mantine. This power can't be used if Mantine is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Spiral Drain',
      cost: [L],
      damage: 10,
      text: 'Remove 1 damage counter from Mantine.',
    },
  ];

  public set: string = 'DF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '20';
  public name: string = 'Mantine';
  public fullName: string = 'Mantine DF';

  public readonly POWER_CIRCULATION_MARKER = 'POWER_CIRCULATION_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: AttackEffect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.POWER_CIRCULATION_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      //Once per turn
      if (HAS_MARKER(this.POWER_CIRCULATION_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      // Cannot use if affected by special condition
      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      //Must have basic energy in discard
      if (
        !player.discard.cards.some(
          (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC,
        )
      ) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      //check if power is blocked
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      //power effect
      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            return store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_DECK,
                player.discard,
                { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
                { min: 1, max: 1, allowCancel: false },
              ),
              (selected) => {

                MOVE_CARDS(store, state, player.discard, player.deck, {
                  cards: selected,
                  sourceCard: this,
                  sourceEffect: this.powers[0],
                  toTop: true,
                });

                store.prompt(
                  state,
                  new ShowCardsPrompt(
                    opponent.id,
                    GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                    selected,
                  ),
                  () => {},
                );

                player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
                  if (cardList.getPokemonCard() === this) {
                    cardList.damage += 10;
                  }
                });

                ADD_MARKER(this.POWER_CIRCULATION_MARKER, player, this);

                player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
                  if (cardList.getPokemonCard() === this) {
                    cardList.addBoardEffect(BoardEffect.ABILITY_USED);
                  }
                });
              },
            );
          }
        },
      );

      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(10, effect, store, state);
    }

    return state;
  }
}
