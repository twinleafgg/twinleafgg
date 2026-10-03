import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { Card, ChooseCardsPrompt, GameError, GameMessage, Player } from '../../../game';

import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Zoroark extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom: string = 'Zorua';

  public cardType: CardType[] = [CardType.DARK];

  public hp: number = 120;

  public weakness = [{ type: CardType.GRASS }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Phantom Transformation',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may choose a Stage 1 Pokémon, except any Zoroark, from your discard pile. If you do, discard this Pokémon and all attached cards, and put the chosen Pokémon in its place.'
  }];

  public attacks = [{
    name: 'Night Daze',
    cost: [CardType.COLORLESS, CardType.COLORLESS],
    damage: 70,
    text: ''
  }];

  public regulationMark = 'E';

  public set: string = 'EVS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '103';

  public name: string = 'Zoroark';

  public fullName: string = 'Zoroark EVS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {

      if (!effect.player.discard.cards.some(b => b instanceof PokemonCard && b.stage === Stage.STAGE_1 && b.name !== this.name)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const getBenchIndex = (player: Player, card: Card) => {
        for (let i = 0; i < player.bench.length; i++) {
          const bench = player.bench[i];
          if (bench.cards.includes(card)) {
            return i;
          }
        }
        return -1;
      };

      const index = getBenchIndex(effect.player, this);

      return store.prompt(state, new ChooseCardsPrompt(
        effect.player,
        GameMessage.CHOOSE_POKEMON_TO_DISCARD,
        effect.player.discard,
        { stage: Stage.STAGE_1 },
        { min: 1, max: 1 }
      ), selected => {

        if (index >= 0) {
          MOVE_CARDS(store, state, effect.player.bench[index], effect.player.discard, { cards: [this], sourceCard: this });
        } else {
          MOVE_CARDS(store, state, effect.player.active, effect.player.discard, { cards: [this], sourceCard: this });
        }

        const replacement = selected[0];

        if (index >= 0) {
          MOVE_CARDS(store, state, effect.player.discard, effect.player.bench[index], { cards: [replacement], sourceCard: this });
        } else {
          MOVE_CARDS(store, state, effect.player.discard, effect.player.active, { cards: [replacement], sourceCard: this });
        }

        return state;
      });

    }
    return state;
  }
}