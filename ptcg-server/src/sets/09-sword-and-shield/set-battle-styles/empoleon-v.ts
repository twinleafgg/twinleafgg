import {
  AttachEnergyPrompt,
  CardTag,
  CardType,
  GameMessage,
  PlayerType,
  PokemonCard,
  PokemonCardList,
  PowerType,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  HANDLE_ABILITY_LOCK,
  LOCKER_ABILITY_APPLIES,
} from '../../../game/store/prefabs/ability-lock';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class EmpoleonV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V, CardTag.RAPID_STRIKE];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 210;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public powers = [
    {
      name: "Emperor's Eyes",
      powerType: PowerType.ABILITY,
      abilityLock: true,
      text: "As long as this Pokémon is in the Active Spot, your opponent's Basic Pokémon in play have no Abilities, except for Pokémon with a Rule Box (Pokémon V, Pokémon-GX, etc. have Rule Boxes).",
    },
  ];

  public attacks = [
    {
      name: 'Swirling Slice',
      cost: [W, C, C],
      damage: 130,
      text: 'Move an Energy from this Pokémon to 1 of your Benched Pokémon.',
    },
  ];

  public regulationMark = 'E';
  public set: string = 'BST';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '40';
  public name: string = 'Empoleon V';
  public fullName: string = 'Empoleon V BST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasBench = player.bench.some((b) => b.cards.length > 0);

      if (hasBench === false) {
        return state;
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.active,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 1, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    HANDLE_ABILITY_LOCK(
      effect,
      ({ card }) => {
        const cardList = StateUtils.findCardList(state, this);
        const owner = StateUtils.findOwner(state, cardList);
        const opponent = StateUtils.getOpponent(state, owner);

        if (owner.active.getPokemonCard() !== this) {
          return false;
        }

        let targetBelongsToOpponent = false;
        opponent.forEachPokemon(PlayerType.TOP_PLAYER, (_list, pokemon) => {
          if (pokemon === card) {
            targetBelongsToOpponent = true;
          }
        });
        if (!targetBelongsToOpponent) {
          return false;
        }

        const targetCardList = StateUtils.findCardList(state, card);
        if (!(targetCardList instanceof PokemonCardList)) {
          return false;
        }

        if (card.stage !== Stage.BASIC) {
          return false;
        }

        if (card.hasRuleBox()) {
          return false;
        }

        // Check + PowerEffect: Emperor's Eyes must itself be usable (e.g. Path to the Peak).
        // First-in-wins vs other Active ability lockers (Bide Barricade, Mischievous Lock, …).
        return LOCKER_ABILITY_APPLIES(store, state, owner, this, this.powers[0], card);
      },
      {
        allowUseFromHand: true,
        allowUseFromDiscard: true,
        error: GameMessage.BLOCKED_BY_ABILITY,
      },
    );

    return state;
  }
}
