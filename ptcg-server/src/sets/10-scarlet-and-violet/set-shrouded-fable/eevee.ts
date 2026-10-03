import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, EnergyCard, GameError, GameMessage, ShuffleDeckPrompt, State, StoreLike } from '../../../game';
import { AttackEffect, Effect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useColorfulCatch(next: Function, store: StoreLike, state: State, effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const maxEnergies = 3;

  const uniqueBasicEnergies = Math.min(maxEnergies, player.deck.cards
    .filter(c => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC)
    .map(e => (e as EnergyCard).provides[0])
    .filter((value, index, self) => self.indexOf(value) === index)
    .length);

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.deck,
    { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
    { min: 0, max: uniqueBasicEnergies, allowCancel: false, differentTypes: true }
  ), selected => {
    cards = selected || [];

    if (selected.length > 1) {
      if (selected[0].name === selected[1].name) {
        throw new GameError(GameMessage.CAN_ONLY_SELECT_TWO_DIFFERENT_ENERGY_TYPES);
      }
    }

    MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: effect.source.getPokemonCard()! });
  });

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export class Eevee extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Colorful Catch',
      cost: [C],
      damage: 0,
      text: 'Search your deck for up to 3 Basic Energy cards of different types, ' +
        'reveal them, and put them into your hand. Then, shuffle your deck.'
    },
    { name: 'Headbutt', cost: [C, C], damage: 20, text: '' },
  ];

  public regulationMark: string = 'H';
  public set: string = 'SFA';
  public name: string = 'Eevee';
  public fullName: string = 'Eevee SFA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '50';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useColorfulCatch(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}