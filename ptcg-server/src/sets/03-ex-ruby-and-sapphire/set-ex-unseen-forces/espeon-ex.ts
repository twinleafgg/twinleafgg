import {
  CardTag,
  CardTarget,
  CardType,
  ChoosePokemonPrompt,
  GameMessage,
  PlayerType,
  PokemonCard,
  Power,
  PowerType,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import {ABILITY_USED,
  CONFIRMATION_PROMPT,
  IS_POKEPOWER_BLOCKED,
  JUST_EVOLVED,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Espeonex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Eevee';
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [P];
  public hp: number = 110;
  public weakness = [{ type: P }];
  public retreat = [];

  public powers: Power[] = [
    {
      name: 'Devo Flash',
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn, when you play Espeon ex from your hand to evolve 1 of your Pokémon, you may choose 1 Evolved Pokémon on your opponent's Bench, remove the highest Stage Evolution card from that Pokémon, and put it back into his or her hand.",
    },
  ];

  public attacks = [
    {
      name: 'Snap Tail',
      cost: [C, C],
      damage: 0,
      text: "Choose 1 of your opponent's Pokémon. This attack does 30 damage to that Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Psyloop',
      cost: [P, C, C],
      damage: 60,
      damageCalculation: '+',
      text: 'Does 60 damage plus 30 more damage for each Trainer card your opponent has in play.',
    },
  ];

  public set: string = 'UF';
  public setNumber: string = '102';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Espeon ex';
  public fullName: string = 'Espeon ex UF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Devo Flash
    if (JUST_EVOLVED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_POKEPOWER_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      const blocked: CardTarget[] = [];
      let hasAnyEvolved = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (list, card, target) => {
        if (opponent.active === list) {
          return;
        }
        const hasEvolution = list.cards.some(
          (c) => c instanceof PokemonCard && c.stage !== Stage.BASIC,
        );
        if (hasEvolution) {
          hasAnyEvolved = true;
        } else {
          blocked.push(target);
        }
      });

      if (!hasAnyEvolved) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, effect.player, (result) => {
        if (result) {
          const player = effect.player;
          const opponent = StateUtils.getOpponent(state, player);

          return store.prompt(
            state,
            new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_EVOLVE,
              PlayerType.TOP_PLAYER,
              [SlotType.BENCH],
              { allowCancel: false, blocked },
            ),
            (targets) => {
              if (!targets || targets.length === 0) {
                return state;
              }
              ABILITY_USED(player, this);
              const target = targets[0];
              const evolutions = target.cards.filter(
                (c) => c instanceof PokemonCard && c.stage !== Stage.BASIC,
              );
              if (evolutions.length > 0) {
                const highestStage = evolutions[evolutions.length - 1];
                MOVE_CARDS(store, state, target, opponent.hand, { cards: [highestStage], sourceCard: this });
              }
              return state;
            },
          );
        }
      });
    }

    // Snap Tail
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(30, effect, store, state);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      let trainerCount = 0;
      const stadiumCard = StateUtils.getStadiumCard(state);

      if (
        stadiumCard &&
        StateUtils.findOwner(state, StateUtils.findCardList(state, stadiumCard)) === effect.opponent
      ) {
        trainerCount++;
      }

      effect.opponent.forEachPokemon(PlayerType.TOP_PLAYER, (list) => {
        list.cards.forEach((card) => {
          if (card instanceof TrainerCard) {
            trainerCount++;
          }
        });
      });

      effect.damage += trainerCount * 30;
    }

    return state;
  }
}
