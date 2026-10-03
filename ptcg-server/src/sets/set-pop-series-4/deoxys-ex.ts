import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, CardTag } from '../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  PowerType,
  PokemonCardList,
  GameError,
  ChooseCardsPrompt,
  GameLog,
} from '../../game';
import { Effect } from '../../game/store/effects/effect';
import {ADD_MARKER,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  SHUFFLE_DECK,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS } from '../../game/store/prefabs/attack-effects';

export class Deoxysex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [P];
  public hp: number = 110;
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [
    {
      name: 'Form Change',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: "Once during your turn (before your attack), you may search your deck for another Deoxys ex and switch it with Deoxys ex. (Any cards attached to Deoxys ex, damage counters, Special Conditions, and effects on it are now on the new Pokémon.) If you do, put Deoxys ex on top of your deck. Shuffle your deck afterward. You can't use more than 1 Form Change Poké-Power each turn.",
    },
  ];

  public attacks = [
    {
      name: 'Fastwave',
      cost: [C, C, C],
      damage: 50,
      shredAttack: true,
      text: "This attack's damage isn't affected by Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.",
    },
  ];

  public set: string = 'P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Deoxys ex';
  public fullName: string = 'Deoxys ex P4';

  public readonly FORME_CHANGE_MARKER = 'FORME_CHANGE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FORME_CHANGE_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const targetCardList = StateUtils.findCardList(state, this);
      if (!(targetCardList instanceof PokemonCardList)) {
        throw new GameError(GameMessage.INVALID_TARGET);
      }

      if (HAS_MARKER(this.FORME_CHANGE_MARKER, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked: number[] = [];

      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name !== this.name) {
          blocked.push(index);
        }
      });

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 1, max: 1, allowCancel: true, blocked },
        ),
        (selection) => {
          if (selection.length <= 0) {
            return state;
          }

          const pokemonCard = selection[0];

          if (!(pokemonCard instanceof PokemonCard)) {
            return state;
          }
          store.log(state, GameLog.LOG_PLAYER_TRANSFORMS_INTO_POKEMON, {
            name: player.name,
            pokemon: this.name,
            card: pokemonCard.name,
            effect: effect.power.name,
          });
          MOVE_CARDS(store, state, player.deck, targetCardList, { cards: [pokemonCard], sourceCard: this });
          MOVE_CARDS(store, state, targetCardList, player.deck, { cards: [this], sourceCard: this });

          SHUFFLE_DECK(store, state, player);
          ADD_MARKER(this.FORME_CHANGE_MARKER, player, this);
        },
      );
    }

    // Fastwave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS(store, state, effect, 50);
    }

    return state;
  }
}
