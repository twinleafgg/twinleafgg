import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { Stage } from '../../../game';
import { Attack } from '../../../game';
import { ChoosePokemonPrompt } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { PlayerType } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CheckPokemonAttacksEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { DEVOLVE_POKEMON } from '../../../game/store/prefabs/prefabs';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';

export class TechnicalMachineTS2 extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '137';
  public name: string = 'Technical Machine TS-2';
  public fullName: string = 'Technical Machine TS-2 LA';
  public text: string = 'Attach this card to 1 of your Pokémon in play. That Pokémon may use this card\'s attack instead of its own. At the end of your turn, discard Technical Machine TS-2.';

  public attacks: Attack[] = [{
    // Devoluter
    name: 'Devoluter',
    cost: [C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Evolved Pokémon, remove the highest Stage Evolution card from that Pokémon, and have your opponent shuffle that card into his or her deck.'
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
      const opponent = StateUtils.getOpponent(state, player);
      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }
      const blocked: { player: PlayerType; slot: SlotType; index: number }[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (list, card, target) => {
        if (card.stage === Stage.BASIC || list.getPokemons().length <= 1) {
          blocked.push(target);
        }
      });
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        const target = selected[0];
        DEVOLVE_POKEMON(store, state, target, opponent.deck);
        SHUFFLE_DECK(store, state, opponent);
      });
    }

    return state;
  }
}
