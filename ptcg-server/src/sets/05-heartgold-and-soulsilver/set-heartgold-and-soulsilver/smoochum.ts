import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, SpecialCondition, Stage, SuperType } from '../../../game/store/card/card-types';
import { GameMessage, MoveEnergyPrompt, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ADD_SLEEP_TO_PLAYER_ACTIVE, IS_POKEBODY_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Smoochum extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 30;
  public cardType: CardType[] = [P];
  public weakness = [];
  public retreat = [];

  public powers = [{
    name: 'Sweet Sleeping Face',
    powerType: PowerType.POKEBODY,
    text: 'As long as Smoochum is Asleep, prevent all damage done to Smoochum by attacks.'
  }];

  public attacks = [{
    name: 'Energy Antics',
    cost: [],
    damage: 0,
    text: 'Move an Energy card attached to 1 of your opponent\'s Pokémon to another of your opponent\'s Pokémon. Smoochum is now Asleep.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '30';
  public name: string = 'Smoochum';
  public fullName: string = 'Smoochum HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sweet Sleeping Face
    if (effect instanceof PutDamageEffect
      && effect.target.cards.includes(this)
      && effect.target.getPokemonCard() === this
      && effect.target.specialConditions.includes(SpecialCondition.ASLEEP)) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (!IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        effect.preventDefault = true;
      }
    }

    // Energy Antics
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, player, this);

      const hasEnergy = opponent.active.cards.some(c => c.superType === SuperType.ENERGY)
        || opponent.bench.some(b => b.cards.some(c => c.superType === SuperType.ENERGY));
      const pokemonCount = [opponent.active, ...opponent.bench].filter(b => b.cards.length > 0).length;
      if (!hasEnergy || pokemonCount < 2) {
        return state;
      }

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 1, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          if (source !== target) {
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        }
      });
    }

    return state;
  }
}
