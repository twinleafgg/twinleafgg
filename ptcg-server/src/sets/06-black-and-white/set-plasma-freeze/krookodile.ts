import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  PlayerType,
  SlotType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Krookodile extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Krokorok';
  public cardType: CardType[] = [D];
  public hp: number = 140;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Piston Headbutt',
      cost: [D],
      damage: 30,
      text: "Move an Energy attached to the Defending Pokémon to 1 of your opponent's Benched Pokémon.",
    },
    {
      name: 'Hammer In',
      cost: [D, C, C],
      damage: 80,
      text: '',
    },
  ];

  public set: string = 'PLF';
  public setNumber: string = '70';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Krookodile';
  public fullName: string = 'Krookodile PLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Piston Headbutt - move energy from defending to opponent's benched
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if defending has energy
      const hasEnergy = opponent.active.cards.some((c) => c.superType === SuperType.ENERGY);
      // Check if opponent has benched Pokemon
      const hasBenched = opponent.bench.some((b) => b.cards.length > 0);

      if (!hasEnergy || !hasBenched) {
        return state;
      }

      // Choose energy to move
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          opponent.active,
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false },
        ),
        (selectedEnergy) => {
          if (!selectedEnergy || selectedEnergy.length === 0) {
            return;
          }

          const energyCard = selectedEnergy[0];

          // Choose benched Pokemon to move energy to
          store.prompt(
            state,
            new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
              PlayerType.TOP_PLAYER,
              [SlotType.BENCH],
              { allowCancel: false },
            ),
            (targets) => {
              if (!targets || targets.length === 0) {
                return;
              }
              MOVE_CARDS(store, state, opponent.active, targets[0], { cards: [energyCard], sourceCard: this });
            },
          );
        },
      );
    }

    return state;
  }
}
