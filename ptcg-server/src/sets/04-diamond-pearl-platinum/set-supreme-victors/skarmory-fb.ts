import { CardTag, CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { ADD_MARKER, HAS_MARKER, MULTIPLE_COIN_FLIPS_PROMPT, REMOVE_MARKER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class SkarmoryFB extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [M];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Silver Feather',
    cost: [M],
    damage: 20,
    text: 'During your opponent\'s next turn, when your opponent puts a Basic Pokémon from his or her hand onto his or her Bench, put 2 damage counters on that Pokémon.'
  }, {
    name: 'Metal Max',
    cost: [C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Discard all Metal Energy attached to Skarmory FB. Flip a coin for each Energy card you discarded. This attack does 20 damage plus 40 damage for each heads.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Skarmory FB';
  public fullName: string = 'Skarmory FB SV';

  public readonly SILVER_FEATHER_MARKER = 'SILVER_FEATHER_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Silver Feather
    if (WAS_ATTACK_USED(effect, 0, this)) {
      ADD_MARKER(this.SILVER_FEATHER_MARKER, effect.opponent, this);
    }

    if (effect instanceof PlayPokemonEffect && HAS_MARKER(this.SILVER_FEATHER_MARKER, effect.player, this)) {
      if (effect.pokemonCard.stage === Stage.BASIC && effect.target !== effect.player.active) {
        effect.target.damage += 20;
      }
    }

    if (effect instanceof EndTurnEffect && HAS_MARKER(this.SILVER_FEATHER_MARKER, effect.player, this)) {
      REMOVE_MARKER(this.SILVER_FEATHER_MARKER, effect.player, this);
    }

    // Metal Max
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      state = store.reduceEffect(state, checkProvidedEnergy);
      const cards = [...new Set(
        checkProvidedEnergy.energyMap
          .filter(em => em.provides.includes(M) || em.provides.includes(CardType.ANY))
          .map(em => em.card)
      )];
      if (cards.length > 0) {
        const discardEnergy = new DiscardCardsEffect(effect, cards);
        discardEnergy.target = player.active;
        store.reduceEffect(state, discardEnergy);
        MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, cards.length, results => {
          effect.damage = 20 + 40 * results.filter(r => r).length;
        });
      }
    }

    return state;
  }
}
