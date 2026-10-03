import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, CardList, EnergyCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {BLOCK_IF_GX_ATTACK_USED,
  IF_OPPONENTS_POKEMON_KO_BY_ATTACK_DAMAGE_TAKE_MORE_PRIZES,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GuzzlordGX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 210;
  protected _tags = [CardTag.ULTRA_BEAST, CardTag.POKEMON_GX];
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C, C];

  public attacks = [
    {
      name: 'Eat Sloppily',
      cost: [D],
      damage: 0,
      text: 'Discard the top 5 cards of your deck. If any of those cards are Energy cards, attach them to this Pokémon.',
    },
    {
      name: 'Tyrannical Hole',
      cost: [D, D, D, C, C],
      damage: 180,
      text: '',
    },
    {
      name: 'Glutton-GX',
      cost: [D, D, D, D, D],
      damage: 100,
      gxAttack: true,
      text: "If your opponent's Pokémon is Knocked Out by damage from this attack, take 2 more Prize cards. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'CIN';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '63';
  public name: string = 'Guzzlord-GX';
  public fullName: string = 'Guzzlord-GX CIN';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const temp = new CardList();
      MOVE_CARDS(store, state, player.deck, temp, { count: 5, sourceCard: this });
      const energyCards = temp.cards.filter((c) => c instanceof EnergyCard);
      MOVE_CARDS(store, state, temp, player.active, { cards: energyCards, sourceCard: this });
      MOVE_CARDS(store, state, temp, player.discard, { sourceCard: this });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;
    }

    return IF_OPPONENTS_POKEMON_KO_BY_ATTACK_DAMAGE_TAKE_MORE_PRIZES(store, state, effect, this, {
      attackName: 'Glutton-GX',
      extraPrizes: 2,
    });
  }
}
