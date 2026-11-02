import { PokemonCard, CardTag, CardType, Stage, ChoosePokemonPrompt, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../game';
import { PutDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Pelipper extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Wingull';
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [];

  public powers = [{
    // Mist
    name: 'Mist',
    powerType: PowerType.POKEBODY,
    text: 'Any damage done to Pelipper by attacks from Stage 2 Evolved Pokémon (both yours and your opponent\'s) is reduced by 30 (after applying Weakness and Resistance).'
  }];

  public attacks = [{
    // Lightning Wing
    name: 'Lightning Wing',
    cost: [L, C, C],
    damage: 50,
    text: 'Does 10 damage to 1 of your Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'P5';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Pelipper δ';
  public fullName: string = 'Pelipper δ P5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Mist
    if (effect instanceof PutDamageEffect && effect.target.cards.includes(this)) {
      const player = StateUtils.findOwner(state, effect.target);
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const sourceCard = effect.source.getPokemonCard();
      if (sourceCard && sourceCard.stage === Stage.STAGE_2 && effect.source.getPokemons().length > 1) {
        effect.damage = Math.max(0, effect.damage - 30);
      }
    }
    // Lightning Wing
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const benched = player.bench.filter(b => b.cards.length > 0);
      if (benched.length === 0) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const damage = new PutDamageEffect(effect, 10);
        damage.target = selected[0];
        store.reduceEffect(state, damage);
      });
    }
    return state;
  }
}
