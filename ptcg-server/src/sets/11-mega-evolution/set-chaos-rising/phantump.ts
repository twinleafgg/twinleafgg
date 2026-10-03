import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { StoreLike, State, StateUtils } from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import {WAS_POWER_USED,
  IS_ABILITY_BLOCKED,
  USE_ABILITY_ONCE_PER_TURN,
  ABILITY_USED,
  REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Phantump extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 70;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Spiteful Evolution',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: "Once during your turn, you may use this Ability. Choose a card in your hand that evolves from this Pokémon and put it onto this Pokémon to evolve it. If you do, place 2 damage counters on the Pokémon you evolved in this way. You can't use this Ability during your first turn.",
    },
  ];

  public attacks = [
    {
      name: 'Mumble',
      cost: [P],
      damage: 10,
      text: '',
    },
  ];

  public regulationMark: string = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '38';
  public name: string = 'Phantump';
  public fullName: string = 'Phantump M4';

  public readonly ENVIOUS_EVOLUTION_MARKER = 'ENVIOUS_EVOLUTION_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      if (state.turn <= 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList | undefined;
      if (!cardList) return state;

      const evolutionInHand = player.hand.cards.filter(
        (c) => c instanceof PokemonCard && c.evolvesFrom === 'Phantump',
      );

      if (evolutionInHand.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked: number[] = [];
      player.hand.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard) || card.evolvesFrom !== 'Phantump') {
          blocked.push(index);
        }
      });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_EVOLVE,
          player.hand,
          { superType: SuperType.POKEMON },
          { min: 0, max: 1, allowCancel: true, blocked },
        ),
        (cards) => {
          const selected = cards || [];
          if (selected.length === 0) return state;

          USE_ABILITY_ONCE_PER_TURN(player, this.ENVIOUS_EVOLUTION_MARKER, this);
          ABILITY_USED(player, this);

          const evolutionCard = selected[0];
          MOVE_CARDS(store, state, player.hand, cardList, { cards: [evolutionCard], sourceCard: this });
          cardList.clearEffects();
          cardList.pokemonPlayedTurn = state.turn;

          const placeDamage = new PlaceDamageCountersEffect(player, cardList, 20, this);
          store.reduceEffect(state, placeDamage);

          return state;
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ENVIOUS_EVOLUTION_MARKER, this);

    return state;
  }
}
