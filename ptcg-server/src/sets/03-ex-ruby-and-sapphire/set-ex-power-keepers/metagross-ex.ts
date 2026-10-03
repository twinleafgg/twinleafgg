import {
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED,
  ADD_MARKER,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  SHUFFLE_DECK,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Metagrossex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Metang';
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [M];
  public hp: number = 150;
  public weakness = [{ type: R }, { type: F }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C, C, C];

  public powers = [
    {
      name: 'Magnetic Redraw',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: "Once during your turn (before your attack), if Metagross ex is your Active Pokémon, you may use this power. Each player shuffles his or her hand into his or her deck. Then, each player draws 4 cards. This power can't be used if Metagross ex is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Scanblast',
      cost: [M, M, C],
      damage: 70,
      text: "Does 70 damage to each of your opponent's Benched Pokémon that has the same name as the Defending Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'PK';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Metagross ex';
  public fullName: string = 'Metagross ex PK';

  public readonly MAGNETIC_REDRAW_MARKER = 'MAGNETIC_REDRAW_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.active.getPokemonCard() !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (HAS_MARKER(this.MAGNETIC_REDRAW_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      ADD_MARKER(this.MAGNETIC_REDRAW_MARKER, player, this);
      ABILITY_USED(player, this);

      MOVE_CARDS(store, state, player.hand, player.deck, { sourceCard: this });
      MOVE_CARDS(store, state, opponent.hand, opponent.deck, { sourceCard: this });

      SHUFFLE_DECK(store, state, player);
      SHUFFLE_DECK(store, state, opponent);

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 4, sourceCard: this });
      MOVE_CARDS(store, state, opponent.deck, opponent.hand, { count: 4, sourceCard: this });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.MAGNETIC_REDRAW_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList === effect.opponent.active) {
          return;
        }
        if (cardList.getPokemonCard()?.name === effect.opponent.active.getPokemonCard()?.name) {
          const damageEffect = new PutDamageEffect(effect, 70);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
