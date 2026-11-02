import { CardTarget, GameError, GameMessage, MoveEnergyPrompt, PlayerType, PokemonCard, PowerType, SlotType, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class BronzongG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [M];
  public hp: number = 90;
  public weakness = [{ type: P }];
  public resistance = [{ type: R, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Galactic Switch',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may move an Energy card attached to 1 of your Pokémon SP to another of your Pokémon. Then, put 2 damage counters on Bronzong G. This power can\'t be used if Bronzong G is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Psychic Pulse',
    cost: [M, C, C],
    damage: 40,
    text: 'Does 10 damage to each of your opponent\'s Benched Pokémon that has any damage counters on it. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';
  public name: string = 'Bronzong G';
  public fullName: string = 'Bronzong G PL';

  public readonly GALACTIC_SWITCH_MARKER = 'GALACTIC_SWITCH_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      effect.player.marker.removeMarker(this.GALACTIC_SWITCH_MARKER, this);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.GALACTIC_SWITCH_MARKER, this);

    // Galactic Switch
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.GALACTIC_SWITCH_MARKER, this);
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      let hasEnergy = false;
      let pokemonCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        pokemonCount += 1;
        if (card.hasTag(CardTag.POKEMON_SP)) {
          const energyAttached = cardList.cards.some(c => c.superType === SuperType.ENERGY);
          hasEnergy = hasEnergy || energyAttached;
        }
      });

      if (!hasEnergy || pokemonCount <= 1) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blockedFrom: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card, target) => {
        if (!card.hasTag(CardTag.POKEMON_SP)) {
          blockedFrom.push(target);
        }
      });

      return store.prompt(state, new MoveEnergyPrompt(
        effect.player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false, blockedFrom }
      ), transfers => {
        if (transfers === null) {
          return;
        }

        for (const transfer of transfers) {
          ABILITY_USED(player, this);

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
            if (cardList.getPokemonCard() === effect.card) {
              store.reduceEffect(state, new PlaceDamageCountersEffect(player, cardList, 20, this, this.powers[0]));
            }
          });

          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }

        return state;
      });
    }

    // Psychic Pulse
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.opponent.bench.forEach(target => {
        if (target.cards.length > 0 && target.damage !== 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
