import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { SuperType } from '../../../game';
import { Attack } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { ChoosePokemonPrompt } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { PlayerType } from '../../../game';
import { PokemonCard } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CheckPokemonAttacksEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';

export class TechnicalMachineTS1 extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '136';
  public name: string = 'Technical Machine TS-1';
  public fullName: string = 'Technical Machine TS-1 LA';
  public text: string = 'Attach this card to 1 of your Pokémon in play. That Pokémon may use this card\'s attack instead of its own. At the end of your turn, discard Technical Machine TS-1.';

  public attacks: Attack[] = [{
    // Evoluter
    name: 'Evoluter',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a card that evolves from 1 of your Pokémon and put it onto that Pokémon. (This counts as evolving that Pokémon.) Shuffle your deck afterward.'
  }];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.tools.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
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
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_EVOLVE,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected[0];
        const pokemonCard = target.getPokemonCard();
        if (!pokemonCard) {
          return;
        }
        const blocked: number[] = [];
        player.deck.cards.forEach((card, index) => {
          if (!(card instanceof PokemonCard) || card.evolvesFrom !== pokemonCard.name) {
            blocked.push(index);
          }
        });
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_EVOLVE,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 0, max: 1, allowCancel: true, blocked }
        ), cards => {
          const evolution = (cards || [])[0] as PokemonCard | undefined;
          if (evolution) {
            MOVE_CARDS(store, state, player.deck, target, { cards: [evolution], sourceCard: this });
            target.clearEffects();
            target.pokemonPlayedTurn = state.turn;
          }
          SHUFFLE_DECK(store, state, player);
        });
      });
    }

    return state;
  }
}
