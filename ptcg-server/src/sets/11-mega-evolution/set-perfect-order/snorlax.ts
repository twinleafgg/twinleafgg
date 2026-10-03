import { PokemonCard, Stage, CardType, StoreLike, State, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt, EnergyType, SuperType, SpecialCondition } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, FLIP_UNTIL_TAILS_AND_COUNT_HEADS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Snorlax extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 160;
  public weakness = [{ type: F }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Gormandizer',
    cost: [C],
    damage: 0,
    text: 'Flip a coin until you get tails. Search your deck for an amount of Basic Energy up to the number of heads and attach it to this Pokémon. Then, shuffle your deck.'
  }, {
    name: 'Collapse',
    cost: [C, C, C, C],
    damage: 160,
    text: 'This Pokémon is now Asleep.'
  }];

  public regulationMark = 'J';

  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '63';
  public name: string = 'Snorlax';
  public fullName: string = 'Snorlax M3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Big Eater - flip coins until tails, search for Basic Energy for each heads
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const stateForCallback = state;

      return FLIP_UNTIL_TAILS_AND_COUNT_HEADS(store, state, player, headsCount => {
        if (headsCount === 0 || player.deck.cards.length === 0) {
          store.prompt(stateForCallback, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);
          });
          return;
        }

        const basicEnergyInDeck = player.deck.cards.filter(card =>
          card.superType === SuperType.ENERGY && card.energyType === EnergyType.BASIC
        );

        if (basicEnergyInDeck.length === 0) {
          store.prompt(stateForCallback, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);
          });
          return;
        }

        const maxToAttach = Math.min(headsCount, basicEnergyInDeck.length);

        store.prompt(stateForCallback, new ChooseCardsPrompt(
          player,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.deck,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: maxToAttach, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            for (const card of cards) {
              MOVE_CARDS(store, state, player.deck, player.active, { cards: [card], sourceCard: this });
            }
          }
          store.prompt(stateForCallback, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);
          });
        });
      });
    }

    // Collapse - Pokemon becomes Asleep
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      player.active.addSpecialCondition(SpecialCondition.ASLEEP);
    }

    return state;
  }
}
