import { State, CardTarget, PlayerType, TrainerCard, TrainerType, Attack, CardType, StoreLike, GameError, GameMessage, ShuffleDeckPrompt, AttachEnergyPrompt, SlotType, SuperType, EnergyType, StateUtils } from "../../../game";
import { ColorlessCostReducer } from "../../../game/store/card/pokemon-interface";
import { CheckAttackCostEffect, CheckPokemonAttacksEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import { AttackEffect } from "../../../game/store/effects/game-effects";
import { IS_TOOL_BLOCKED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

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
  public set: string = 'DLR';
  public setNumber: string = '100';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Rayquaza Cap';
  public fullName: string = 'Mega Rayquaza Cap M6';
    public text: string = 'The Pokémon this card is attached to can use the attack on this card. (You still need the necessary Energy to use this attack.)';

  public attacks: Attack[] = [{
      name: 'Delta Gift',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'For each of your Pokémon that has a Mega Rayquaza Cap attached, search your deck for a Basic Energy card and attach it to that Pokémon. Then, shuffle your deck.',
    }];

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
