import { PokemonCardList, State, StateUtils, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AttachPokemonToolEffect } from '../../../game/store/effects/play-card-effects';
import { IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class BufferPiece extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '84';
  public name: string = 'Buffer Piece';
  public fullName: string = 'Buffer Piece AR';
  public text: string = 'Attach Buffer Piece to 1 of your Pokémon that doesn\'t already have a Pokémon Tool attached to it. If that Pokémon is Knocked Out, discard this card. Any damage done to the Pokémon this card is attached to by an opponent\'s attack is reduced by 20 (after applying Weakness and Resistance). At the end of your opponent\'s turn after you played Buffer Piece, discard Buffer Piece.';

  public playedTurn: number | undefined;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttachPokemonToolEffect && effect.trainerCard === this) {
      this.playedTurn = state.turn;
    }

    if ((effect instanceof DealDamageEffect || effect instanceof PutDamageEffect) && effect.target.tools.includes(this)) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_TOOL_BLOCKED(store, state, owner, this)) {
        return state;
      }
      if (effect.player === owner) {
        return state;
      }
      effect.damage = Math.max(0, effect.damage - 20);
    }

    if (effect instanceof EndTurnEffect && this.playedTurn !== undefined) {
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (effect.player !== owner) {
        const host = cardList as PokemonCardList;
        const toolIdx = host.tools.indexOf(this);
        if (toolIdx !== -1) {
          host.tools.splice(toolIdx, 1);
        }
        MOVE_CARDS(store, state, host, owner.discard, { cards: [this], sourceCard: this });
        this.playedTurn = undefined;
      }
    }

    return state;
  }
}
