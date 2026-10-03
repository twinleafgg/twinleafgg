import {
  AttachEnergyPrompt,
  Attack,
  CardTarget,
  GameError,
  GameMessage,
  PlayerType,
  ShuffleDeckPrompt,
  SlotType,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { CardType, EnergyType, TrainerType } from '../../../game/store/card/card-types';
import { ColorlessCostReducer } from '../../../game/store/card/pokemon-interface';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  CheckAttackCostEffect,
  CheckPokemonAttacksEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function buildCapHolderBlockedTo(player: State['players'][number], capName: string): CardTarget[] {
  const blocked: CardTarget[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
    if (!cardList.tools.some((tool) => tool.name === capName)) {
      blocked.push(target);
    }
  });
  return blocked;
}

function countCapHolders(player: State['players'][number], capName: string): number {
  let count = 0;
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
    if (cardList.tools.some((tool) => tool.name === capName)) {
      count += 1;
    }
  });
  return count;
}

export class MegaRayquazaCap extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public regulationMark: string = 'J';
  public set: string = 'M6';
  public setNumber: string = '66';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Rayquaza Cap';
  public fullName: string = 'Mega Rayquaza Cap M6';

  public attacks: Attack[] = [
    {
      name: 'Delta Gift',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'For each of your Pokémon in play that has a Mega Rayquaza Cap attached to it, search your deck for a Basic Energy and attach it to that Pokémon. Then, shuffle your deck.',
    },
  ];

  public text: string = 'The Pokémon this card is attached to can use the attack on this card.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-paradox-rift/technical-machine-blindside.ts (tool attack grant)
    if (effect instanceof CheckAttackCostEffect && effect.attack === this.attacks[0]) {
      const pokemonCard = effect.player.active.getPokemonCard();
      if (pokemonCard && 'getColorlessReduction' in pokemonCard) {
        const reduction = (pokemonCard as ColorlessCostReducer).getColorlessReduction(state);
        for (let i = 0; i < reduction && effect.cost.includes(CardType.COLORLESS); i++) {
          const index = effect.cost.indexOf(CardType.COLORLESS);
          if (index !== -1) {
            effect.cost.splice(index, 1);
          }
        }
      }
    }

    if (
      effect instanceof CheckPokemonAttacksEffect &&
      effect.player.active.tools.includes(this) &&
      !effect.attacks.includes(this.attacks[0])
    ) {
      effect.attacks.push(this.attacks[0]);
    }

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;

      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      const capHolderCount = countCapHolders(player, this.name);

      if (capHolderCount === 0) {
        return state;
      }

      if (player.deck.cards.length === 0) {
        return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
          player.deck.applyOrder(order);
        });
      }

      const blockedTo = buildCapHolderBlockedTo(player, this.name);

      // Ref: set-paradox-rift/professor-sadas-vitality.ts (one prompt, differentTargets)
      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 0, max: capHolderCount, blockedTo, differentTargets: true },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const attachTarget = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, attachTarget, {
              cards: [transfer.card],
              sourceCard: this,
            });
          }
          store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }

    return state;
  }
}
