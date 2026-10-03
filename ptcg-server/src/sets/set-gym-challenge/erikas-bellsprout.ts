import {
  PokemonCard,
  Stage,
  CardType,
  PowerType,
  StoreLike,
  State,
  MoveEnergyPrompt,
  GameMessage,
  PlayerType,
  SlotType,
  SuperType,
  StateUtils,
  GameError,
  CardTag,
} from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../game/store/effects/play-card-effects';
import {WAS_POWER_USED,
  ABILITY_USED,
  WAS_ATTACK_USED,
  BLOCK_IF_ASLEEP_CONFUSED_PARALYZED,
  ADD_MARKER,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  REMOVE_MARKER,
  THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class ErikasBellsprout extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  protected _tags = [CardTag.ERIKAS];
  public hp: number = 40;
  public weakness = [{ type: R }];
  public retreat = [C];

  public powers = [
    {
      name: 'Soak Up',
      useWhenInPlay: true,
      powerType: PowerType.POKEMON_POWER,
      text: "Once during your turn (before your attack), you may take up to 2 [G] Energy cards attached to your other Pokémon and attach them to Erika's Bellsprout. This power can't be used if Erika's Bellsprout is Asleep, Confused, or Paralyzed.",
    },
  ];

  public attacks = [
    {
      name: 'Stretch Vine',
      cost: [G],
      damage: 10,
      text: "Choose 1 of your opponent's Benched Pokémon, and this attack does 10 damage to it. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'G2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '38';
  public name: string = "Erika's Bellsprout";
  public fullName: string = "Erika's Bellsprout G2";

  public ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Soak Up

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      REMOVE_MARKER(this.ABILITY_USED_MARKER, player, this);
      return state;
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      BLOCK_IF_ASLEEP_CONFUSED_PARALYZED(player, this);

      if (HAS_MARKER(this.ABILITY_USED_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      let grassEnergyCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (
          cardList.cards.some(
            (card) => card.superType === SuperType.ENERGY && card.name === 'Grass Energy',
          )
        ) {
          grassEnergyCount++;
        }
      });

      if (grassEnergyCount === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      ABILITY_USED(player, this);
      ADD_MARKER(this.ABILITY_USED_MARKER, player, this);

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY, name: 'Grass Energy' },
          { allowCancel: true, min: 1, max: 2 },
        ),
        (transfers) => {
          transfers = transfers || [];
          if (transfers.length > 0) {
            for (const transfer of transfers) {
              if (
                StateUtils.getTarget(state, player, transfer.to) !==
                StateUtils.findCardList(state, this)
              ) {
                throw new GameError(GameMessage.INVALID_TARGET);
              }
              const source = StateUtils.getTarget(state, player, transfer.from);
              const target = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
            }
          }
        },
      );
    }

    // Stretch Vine
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state, 1, 1);
    }

    return state;
  }
}
