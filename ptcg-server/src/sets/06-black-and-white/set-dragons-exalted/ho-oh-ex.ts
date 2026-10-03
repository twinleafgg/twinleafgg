import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PowerType,
  EnergyCard,
  GameError,
  GameMessage,
  PokemonCardList,
  ChooseCardsPrompt,
} from '../../../game';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED,
  WAS_POWER_USED,
  COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useRebirth(
  next: Function,
  store: StoreLike,
  state: State,
  self: HoOhEx,
  effect: PowerEffect,
): IterableIterator<State> {
  const player = effect.player;

  // Check if card is in the discard
  if (player.discard.cards.includes(self) === false) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }

  const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);
  if (slots.length === 0) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }

  // Power already used
  if (player.marker.hasMarker(self.REBIRTH_MAREKER, self)) {
    throw new GameError(GameMessage.POWER_ALREADY_USED);
  }

  player.marker.addMarker(self.REBIRTH_MAREKER, self);

  let flipResult = false;
  yield COIN_FLIP_PROMPT(store, state, player, (result) => {
    flipResult = result;
    next();
  });

  if (flipResult === false) {
    return state;
  }

  MOVE_CARDS(store, state, player.discard, slots[0], { cards: [self], sourceCard: self });

  let basicEnergies = 0;
  const typeMap: { [key: number]: boolean } = {};
  player.discard.cards.forEach((c) => {
    if (c instanceof EnergyCard && c.energyType === EnergyType.BASIC) {
      const cardType = c.provides[0];
      if (typeMap[cardType] === undefined) {
        basicEnergies += 1;
        typeMap[cardType] = true;
      }
    }
  });

  if (basicEnergies === 0) {
    return state;
  }

  const count = Math.min(3, basicEnergies);
  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_ATTACH,
      player.discard,
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
      { min: count, max: count, allowCancel: false, differentTypes: true },
    ),
    (selected) => {
      const cards = selected || [];
      MOVE_CARDS(store, state, player.discard, slots[0], { cards: cards, sourceCard: self });
    },
  );
}

export class HoOhEx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_EX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 160;
  public weakness = [{ type: W }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Rebirth',
      useFromDiscard: true,
      powerType: PowerType.ABILITY,
      text:
        'Once during your turn (before your attack), if this Pokemon is ' +
        'in your discard pile, you may flip a coin. If heads, put this Pokemon ' +
        'onto your Bench and attach 3 different types of basic Energy cards ' +
        'from your discard pile to this Pokemon.',
    },
  ];

  public attacks = [
    {
      name: 'Rainbow Burn',
      cost: [C, C, C],
      damage: 20,
      text:
        'Does 20 more damage for each different type of basic Energy ' +
        'attached to this Pokemon.',
    },
  ];

  public set: string = 'DRX';
  public name: string = 'Ho-Oh-EX';
  public fullName: string = 'Ho-Oh EX DRX';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';

  public readonly REBIRTH_MAREKER = 'REBIRTH_MAREKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let basicEnergies = 0;
      const typeMap: { [key: number]: boolean } = {};
      player.active.cards.forEach((c) => {
        if (c.superType === SuperType.ENERGY && (c as EnergyCard).energyType === EnergyType.BASIC) {
          const cardType = (c as EnergyCard).provides[0];
          if (typeMap[cardType] === undefined) {
            basicEnergies += 1;
            typeMap[cardType] = true;
          }
        }
      });

      effect.damage += basicEnergies * 20;
      return state;
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = useRebirth(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.REBIRTH_MAREKER, this)
    ) {
      effect.player.marker.removeMarker(this.REBIRTH_MAREKER, this);
    }

    return state;
  }
}
