import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { GameMessage, PlayerType, SlotType, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CardTarget } from '../../../game/store/actions/play-card-action';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Meowscaradaex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Floragato';
  public cardType: CardType[] = [G];
  public hp: number = 320;
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Magical Bullet',
    cost: [C, C],
    damage: 120,
    text: "This attack also does 120 damage to 1 of your opponent's Benched Pokémon that has any damage counters on it. (Don't apply Weakness and Resistance for Benched Pokémon.)",
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '14';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Meowscarada ex';
  public fullName: string = 'Meowscarada ex MEM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Magical Bullet
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasDamagedBenched = opponent.bench.some((b) => b.cards.length > 0 && b.damage > 0);
      if (!hasDamagedBenched) {
        return state;
      }

      const blocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList === opponent.active || cardList.damage === 0) {
          blocked.push(target);
        }
      });

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { allowCancel: true, blocked },
        ),
        (targets: PokemonCardList[]) => {
          if (!targets || targets.length === 0) {
            return;
          }
          const damageEffect = new PutDamageEffect(effect, 120);
          damageEffect.target = targets[0];
          store.reduceEffect(state, damageEffect);
        },
      );
    }

    return state;
  }
}
