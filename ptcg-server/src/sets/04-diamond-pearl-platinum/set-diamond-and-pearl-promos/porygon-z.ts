import { Card } from '../../../game';
import { CardList } from '../../../game';
import { CardManager } from '../../../game';
import { CardTarget } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { ChoosePokemonPrompt } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { PlayerType } from '../../../game';
import { PokemonCardList } from '../../../game';
import { PowerType } from '../../../game';
import { ShuffleDeckPrompt } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { TrainerCard } from '../../../game';
import { CardTag } from '../../../game/store/card/card-types';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { BLOCK_IF_HAS_SPECIAL_CONDITION } from '../../../game/store/prefabs/prefabs';
import { IS_POKEPOWER_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

function isTechnicalMachine(card: Card): boolean {
  if (!(card instanceof TrainerCard)) {
    return false;
  }
  return card.hasTag(CardTag.TECHNICAL_MACHINE)
    || card.name.includes('Technical Machine');
}

function* useLearning(next: Function, store: StoreLike, state: State, effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    return state;
  }

  const cm = CardManager.getInstance();
  const lvXs = cm.getAllCards().filter(c => {
    return c instanceof PokemonCard && c.stage === Stage.LV_X;
  }) as PokemonCard[];

  const validNames: string[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
    lvXs.forEach(lvx => {
      if (lvx.evolvesFrom === card.name && !validNames.includes(lvx.name)) {
        validNames.push(lvx.name);
      }
    });
  });

  const blocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (!(card instanceof PokemonCard) || card.stage !== Stage.LV_X || !validNames.includes(card.name)) {
      blocked.push(index);
    }
  });

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_EVOLVE,
    player.deck,
    { superType: SuperType.POKEMON },
    { min: 0, max: 1, allowCancel: true, blocked }
  ), selected => {
    cards = selected || [];
    next();
  });

  if (cards.length === 0) {
    return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
      player.deck.applyOrder(order);
    });
  }

  const lvX = cards[0] as PokemonCard;
  const blocked2: CardTarget[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card, target) => {
    if (card.name !== lvX.evolvesFrom) {
      blocked2.push(target);
    }
  });

  let targets: PokemonCardList[] = [];
  yield store.prompt(state, new ChoosePokemonPrompt(
    player.id,
    GameMessage.CHOOSE_POKEMON_TO_EVOLVE,
    PlayerType.BOTTOM_PLAYER,
    [SlotType.ACTIVE, SlotType.BENCH],
    { allowCancel: false, blocked: blocked2 }
  ), selection => {
    targets = selection || [];
    next();
  });

  if (targets.length > 0) {
    MOVE_CARDS(store, state, player.deck, targets[0], { cards: [lvX], sourceCard: effect.source.getPokemonCard()! });
    targets[0].pokemonPlayedTurn = state.turn;
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export class PorygonZ extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Porygon2';
  public hp: number = 120;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: 30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Install',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'As often as you like during your turn (before your attack), move a Technical Machine card attached to 1 of your Pokémon to another of your Pokémon. This power can\'t be used if Porygon-Z is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Learning',
    cost: [],
    damage: 0,
    text: 'Search your deck for a Pokémon LV.X that levels up from 1 of your Pokémon, and put it onto that Pokémon. (This counts as leveling up that Pokémon.) Shuffle your deck afterward.'
  },
  {
    name: 'Overload',
    cost: [C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Does 40 damage plus 20 more damage for each Technical Machine card attached to Porygon-Z.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP35';
  public name: string = 'Porygon-Z';
  public fullName: string = 'Porygon-Z DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Install
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const pool = new CardList();
      const attached: { card: Card; list: PokemonCardList }[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const candidates = [...cardList.tools, ...cardList.cards];
        for (const card of candidates) {
          if (!isTechnicalMachine(card) || attached.some(entry => entry.card === card)) {
            continue;
          }
          pool.cards.push(card);
          attached.push({ card, list: cardList });
        }
      });

      if (pool.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        pool,
        {},
        { min: 1, max: 1, allowCancel: true }
      ), selected => {
        const cards = selected || [];
        if (cards.length === 0) {
          return;
        }
        const tm = cards[0];
        const source = attached.find(entry => entry.card === tm)?.list;
        if (!source) {
          return;
        }
        const blocked: CardTarget[] = [];
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
          if (list === source) {
            blocked.push(target);
          }
        });
        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false, blocked }
        ), targets => {
          if (!targets || targets.length === 0) {
            return;
          }
          MOVE_CARDS(store, state, source, targets[0], { cards: [tm], sourceCard: this });
        });
      });
    }

    // Learning
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useLearning(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    // Overload
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const tmCount = effect.player.active.cards.filter(c => isTechnicalMachine(c)).length
        + effect.player.active.tools.filter(c => isTechnicalMachine(c)).length;
      effect.damage += 20 * tmCount;
    }

    return state;
  }
}
