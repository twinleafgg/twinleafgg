import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
} from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  GameMessage,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  PlayerType,
  SlotType,
  EnergyCard,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED,
  WAS_POWER_USED,
  IS_ABILITY_BLOCKED,
  USE_ABILITY_ONCE_PER_TURN,
  REMOVE_MARKER_AT_END_OF_TURN,
  ABILITY_USED,
  SHUFFLE_DECK,
  BLOCK_IF_DECK_EMPTY,
  HEAL_X_DAMAGE_FROM_THIS_POKEMON, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Chandelure extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Lampent';
  public cardType: CardType[] = [R];
  public hp: number = 130;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Flare Navigate',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn (before your attack), you may search your deck for a [R] Energy card and attach it to 1 of your Pokémon. If you do, put 1 damage counter on that Pokémon. Shuffle your deck afterward.',
    },
  ];

  public attacks = [
    {
      name: 'Absorb Life',
      cost: [R, R, C],
      damage: 70,
      text: 'Heal 30 damage from this Pokémon.',
    },
  ];

  public set: string = 'PLF';
  public setNumber: string = '16';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Chandelure';
  public fullName: string = 'Chandelure PLF';

  public readonly FLARE_NAVIGATE_MARKER = 'FLARE_NAVIGATE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Flare Navigate
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      BLOCK_IF_DECK_EMPTY(player);
      USE_ABILITY_ONCE_PER_TURN(player, this.FLARE_NAVIGATE_MARKER, this);
      ABILITY_USED(player, this);

      // Build blocked list: only allow [R] Energy cards
      const blocked: number[] = [];
      player.deck.cards.forEach((c, index) => {
        if (
          c.superType !== SuperType.ENERGY ||
          (c as EnergyCard).energyType !== EnergyType.BASIC ||
          !(c as EnergyCard).provides.includes(CardType.FIRE)
        ) {
          blocked.push(index);
        }
      });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.ENERGY },
          { min: 0, max: 1, allowCancel: true, blocked },
        ),
        (selected) => {
          if (!selected || selected.length === 0) {
            SHUFFLE_DECK(store, state, player);
            return;
          }

          const energyCard = selected[0];

          // Choose a Pokemon to attach the energy to
          store.prompt(
            state,
            new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.ACTIVE, SlotType.BENCH],
              { allowCancel: false },
            ),
            (targets) => {
              if (!targets || targets.length === 0) {
                SHUFFLE_DECK(store, state, player);
                return;
              }

              const target = targets[0];
              MOVE_CARDS(store, state, player.deck, target, { cards: [energyCard], sourceCard: this });
              SHUFFLE_DECK(store, state, player);

              // Put 1 damage counter on that Pokemon
              target.damage += 10;
            },
          );
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FLARE_NAVIGATE_MARKER, this);

    // Attack: Absorb Life
    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 30);
    }

    return state;
  }
}
