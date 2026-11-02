import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { CardTarget, EnergyCard, GameError, GameMessage, MoveEnergyPrompt, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Mismagius extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Misdreavus';
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Magical Trans',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may move a Psychic Energy attached to 1 of your Pokémon to another of your Pokémon. This power can\'t be used if Mismagius is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Psychic Pulse',
    cost: [P],
    damage: 30,
    text: 'Does 10 damage to each of your opponent\'s Benched Pokémon that has any damage counters on it. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Mismagius';
  public fullName: string = 'Mismagius UL';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Magical Trans
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const pokemonCount = [player.active, ...player.bench].filter(b => b.cards.length > 0).length;
      let hasPsychic = false;
      const blockedMap: { source: CardTarget, blocked: number[] }[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
        const blocked: number[] = [];
        cardList.cards.forEach((card, index) => {
          const isPsychic = card instanceof EnergyCard
            && card.energyType === EnergyType.BASIC
            && card.name === 'Psychic Energy';
          if (!isPsychic) {
            blocked.push(index);
          } else {
            hasPsychic = true;
          }
        });
        blockedMap.push({ source: target, blocked });
      });
      if (!hasPsychic || pokemonCount < 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 1, max: 1, blockedMap }
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

    // Psychic Pulse
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.opponent.bench.forEach(target => {
        if (target.cards.length > 0 && target.damage > 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
