import { fossilEvolvesTo, fossilHp } from '../textAccuracy';
import type { AttackDraft } from '../types';

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function generateFossilSource(options: {
  className: string;
  fullName: string;
  name: string;
  set: string;
  setNumber: string;
  text: string;
}): string {
  const evolvesTo = fossilEvolvesTo(options.name);
  const hp = fossilHp(options.name);
  const name = escapeString(options.name);
  const text = escapeString(options.text);
  const evolvesToLine = evolvesTo
    ? `  public evolvesTo = ['${escapeString(evolvesTo)}'];`
    : `  public evolvesTo = [];`;

  return `import { TrainerCard } from '../../game';
import { TrainerType, Stage, CardType, PokemonType, GameError, GameLog, GameMessage, Player, PokemonCard, PokemonCardList, Power, PowerType, State, StateUtils, StoreLike } from '../../game';
import { AddSpecialConditionsEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { RetreatEffect } from '../../game/store/effects/game-effects';
import { PlayItemEffect, PlayPokemonEffect } from '../../game/store/effects/play-card-effects';
import { MOVE_CARDS, WAS_POWER_USED } from '../../game/store/prefabs/prefabs';

export class ${options.className} extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public cardTypez: CardType = CardType.COLORLESS;
  public movedToActiveThisTurn = false;
  public pokemonType = PokemonType.NORMAL;
  public evolvesFrom = '';
  public cardTag = [];
  public tools = [];
${evolvesToLine}
  public evolvesToStage = [];
  public archetype = [];
  public hp: number = ${hp};
  public weakness = [];
  public retreat = [];
  public resistance = [];
  public attacks = [];
  public maxTools: number = 1;
  public evolvesFromBase: string[] = [];

  public powers: Power[] = [{
    name: '${name}',
    text: '${text}',
    useWhenInPlay: true,
    exemptFromAbilityLock: true,
    isFossil: true,
    powerType: PowerType.TRAINER_ABILITY
  }];

  public set: string = '${escapeString(options.set)}';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '${escapeString(options.setNumber)}';
  public name: string = '${name}';
  public fullName: string = '${escapeString(options.fullName)}';
  public text: string = '${text}';

  public canPlay(_store: StoreLike, _state: State, player: Player): boolean {
    return player.bench.some(b => b.cards.length === 0);
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this as unknown as PokemonCard)) {
      const player = effect.player;
      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, {
        name: player.name,
        card: this.name,
        effect: this.powers[0].name
      });
      const cardList = StateUtils.findCardList(state, this);
      if (cardList instanceof PokemonCardList && player.active === cardList && player.bench.some(b => b.cards.length > 0)) {
        player.switchPokemon(cardList);
      }
      MOVE_CARDS(store, state, cardList, player.discard, { sourceCard: this });
    }

    if (effect instanceof PlayItemEffect && effect.trainerCard === this) {
      const player = effect.player;
      const emptySlots = player.bench.filter(b => b.cards.length === 0);
      if (emptySlots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      const playPokemonEffect = new PlayPokemonEffect(player, this as unknown as PokemonCard, emptySlots[0]);
      store.reduceEffect(state, playPokemonEffect);
    }

    if (effect instanceof AddSpecialConditionsEffect && effect.target.getPokemonCard() === this) {
      effect.preventDefault = true;
    }

    if (effect instanceof RetreatEffect && effect.player.active.getPokemonCard() === this) {
      throw new GameError(GameMessage.CANNOT_RETREAT);
    }

    return state;
  }
}
`;
}

export function generateTechnicalMachineShell(options: {
  className: string;
  fullName: string;
  name: string;
  set: string;
  setNumber: string;
  text: string;
  attacksSource: string;
  attackReduceBody: string;
  extraImports: string[];
}): string {
  const name = escapeString(options.name);
  const text = escapeString(options.text);
  const imports = [
    `import { TrainerCard } from '../../game';`,
    `import { TrainerType, GameError, GameMessage, PlayerType, State, StoreLike } from '../../game';`,
    `import { CheckPokemonAttacksEffect } from '../../game/store/effects/check-effects';`,
    `import { Effect } from '../../game/store/effects/effect';`,
    `import { AttackEffect } from '../../game/store/effects/game-effects';`,
    `import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';`,
    `import { IS_TOOL_BLOCKED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';`,
    ...options.extraImports,
  ];

  return `${imports.join('\n')}

export class ${options.className} extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = '${escapeString(options.set)}';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '${escapeString(options.setNumber)}';
  public name: string = '${name}';
  public fullName: string = '${escapeString(options.fullName)}';
  public text: string = '${text}';

${options.attacksSource}

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.tools.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
    }

    if (
      effect instanceof CheckPokemonAttacksEffect &&
      effect.player.active.tools.includes(this) &&
      this.attacks[0] &&
      !effect.attacks.includes(this.attacks[0])
    ) {
      effect.attacks.push(this.attacks[0]);
    }

    if (effect instanceof AttackEffect && this.attacks[0] && effect.attack === this.attacks[0]) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }
${options.attackReduceBody}
    }

    return state;
  }
}
`;
}

export function formatTrainerAttacks(attacks: AttackDraft[]): string {
  if (attacks.length === 0) return '  public attacks = [];';
  const bodies = attacks.map(attack => {
    const cost = attack.cost
      ? `[${attack.cost.toUpperCase().replace(/[^GRWLPFDMYNCA]/g, '').split('').join(', ')}]`
      : '[]';
    const damage = Number(attack.damage) || 0;
    const calc = attack.damageCalculation
      ? `\n    damageCalculation: '${attack.damageCalculation}',`
      : '';
    return `  {\n    name: '${escapeString(attack.name)}',\n    cost: ${cost},\n    damage: ${damage},${calc}\n    text: '${escapeString(attack.text)}'\n  }`;
  });
  return `  public attacks = [${bodies.join(',\n')}];`;
}
