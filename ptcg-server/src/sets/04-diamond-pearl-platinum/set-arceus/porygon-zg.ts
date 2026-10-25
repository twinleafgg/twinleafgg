import { ChooseCardsPrompt, GameMessage, State, StateUtils, StoreLike, TrainerCard, TrainerType } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARDS, SHUFFLE_DECK, SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class PorygonZG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Dowsing Code',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Porygon-Z G from your hand onto your Bench, you may search your discard pile for up to 2 Pokémon Tool cards, show them to your opponent, and shuffle them into your deck.'
  }];

  public attacks = [{
    name: 'Ambush',
    cost: [C, C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 damage plus 40 more damage.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '26';
  public name: string = 'Porygon-Z G';
  public fullName: string = 'Porygon-Z G AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dowsing Code
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      if (effect.target === player.active) {
        return state;
      }
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }
      const tools = player.discard.cards.filter(c => c instanceof TrainerCard && c.trainerType === TrainerType.TOOL);
      if (tools.length === 0) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        const opponent = StateUtils.getOpponent(state, player);
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          player.discard,
          { superType: SuperType.TRAINER, trainerType: TrainerType.TOOL },
          { min: 1, max: Math.min(2, tools.length), allowCancel: true }
        ), selected => {
          const cards = selected || [];
          if (cards.length === 0) {
            return;
          }
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          MOVE_CARDS(store, state, player.discard, player.deck, { cards, sourceCard: this });
          SHUFFLE_DECK(store, state, player);
        });
      });
    }

    // Ambush
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 40);
    }

    return state;
  }
}
