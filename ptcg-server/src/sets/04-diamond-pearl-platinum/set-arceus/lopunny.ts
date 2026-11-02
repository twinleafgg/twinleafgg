import { ChooseCardsPrompt, GameError, GameMessage, PlayerType, PowerType, State, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Lopunny extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Buneary';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Relaxing Shower',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may discard an Energy card from your hand. If you do, remove 1 damage counter from each of your Pokémon. This power can\'t be used if Lopunny is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Hover Heal',
    cost: [C, C],
    damage: 40,
    text: 'Remove all Special Conditions from Lopunny.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '21';
  public name: string = 'Lopunny';
  public fullName: string = 'Lopunny AR';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Relaxing Shower
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      const hasEnergy = player.hand.cards.some(c => c.superType === SuperType.ENERGY);
      if (!hasEnergy) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
        ABILITY_USED(player, this);
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          store.reduceEffect(state, new HealEffect(player, cardList, 10));
        });
      });
    }

    // Hover Heal
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.player.active.specialConditions = [];
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
