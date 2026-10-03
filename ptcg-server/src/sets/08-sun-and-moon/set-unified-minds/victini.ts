import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, PlayerType, SlotType, ChooseCardsPrompt, ChoosePokemonPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Victini extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 70;
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Victory Sign',
      cost: [R],
      damage: 0,
      text: 'Search your deck for up to 2 basic Energy cards of different types and attach them to your Pokémon in any way you like. Then, shuffle your deck.'
    },
    {
      name: 'Flare',
      cost: [R],
      damage: 20,
      text: ''
    }
  ];

  public set: string = 'UNM';
  public setNumber: string = '26';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Victini';
  public fullName: string = 'Victini UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Victory Sign
    // Refs: set-ultra-prism/shaymin.ts (Coax - differentTypes search), set-unbroken-bonds/kyurem.ts (Call Forth Cold - attach energy)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 0, max: 2, allowCancel: true, differentTypes: true }
      ), selected => {
        const cards = selected || [];

        if (cards.length === 0) {
          return SHUFFLE_DECK(store, state, player);
        }

        // Attach each energy to a Pokemon one by one
        const attachNext = (index: number): void => {
          if (index >= cards.length) {
            SHUFFLE_DECK(store, state, player);
            return;
          }

          store.prompt(state, new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            { min: 1, max: 1, allowCancel: false }
          ), targets => {
            if (targets && targets.length > 0) {
              MOVE_CARDS(store, state, player.deck, targets[0], { cards: [cards[index]], sourceCard: this });
            }
            attachNext(index + 1);
          });
        };

        attachNext(0);
      });
    }

    return state;
  }
}
