import { CardType, PokemonCard, Stage, AttachEnergyPrompt, CardList, EnergyCard, EnergyType, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {SHOW_CARDS_TO_PLAYER, SHUFFLE_CARDS_INTO_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cryogonal extends PokemonCard {

  public stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp = 90;
  public weakness = [{ type: M }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Element Chain',
      cost: [W],
      damage: 0,
      text: 'Look at the top 6 cards of your deck and attach any number of basic Energy cards ' +
        'you find there to your Pokémon in any way you like. Shuffle the other cards back into your deck.'
    },
    { name: 'Icy Snow', cost: [W, C], damage: 30, text: '' }
  ];

  public set: string = 'EVS';
  public regulationMark = 'E';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '43';
  public name: string = 'Cryogonal';
  public fullName: string = 'Cryogonal EVS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {

      const player = effect.player;
      const temp = new CardList();
      MOVE_CARDS(store, state, player.deck, temp, { count: 6, sourceCard: this });

      SHOW_CARDS_TO_PLAYER(store, state, player, temp.cards);

      // Check if any cards drawn are basic energy
      const energyCardsDrawn = temp.cards.filter(card => {
        return card instanceof EnergyCard && card.energyType === EnergyType.BASIC;
      });

      // If no energy cards were drawn, move all cards to deck
      if (energyCardsDrawn.length == 0) {
        SHUFFLE_CARDS_INTO_DECK(store, state, player, temp.cards);
      } else {
        // Prompt to attach energy if any were drawn
        return store.prompt(state, new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          temp, // Only show drawn energies
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: energyCardsDrawn.length }
        ), transfers => {

          // Attach energy based on prompt selection
          if (transfers) {
            for (const transfer of transfers) {
              const target = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, temp, target, { cards: [transfer.card], sourceCard: this }); // Move card to target
            }
            SHUFFLE_CARDS_INTO_DECK(store, state, player, temp.cards);
          }
          return state;
        });
      }
      return state;
    }
    return state;
  }
}
