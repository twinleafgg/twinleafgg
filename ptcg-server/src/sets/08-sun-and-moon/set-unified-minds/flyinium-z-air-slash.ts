import { Attack, PokemonCardList, StateUtils } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { AbstractAttackEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonAttacksEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { BLOCK_IF_GX_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class FlyiniumZAirSlash extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'UNM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '195';

  public name: string = 'Flyinium Z: Air Slash';

  public fullName: string = 'Flyinium Z: Air Slash UNM';

  public attacks: Attack[] = [
    {
      name: 'Speeding Skystrike-GX',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 180,
      text: "Prevent all effects of attacks, including damage, done to this Pokémon during your opponent's next turn. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public text: string =
    'If the Pokémon this card is attached to has the Air Slash attack, it can use the GX attack on this card. (You still need the necessary Energy to use this attack.)';

  public FLYINIUM_Z_MARKER = 'FLYINIUM_Z_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof CheckPokemonAttacksEffect &&
      effect.player.active.getPokemonCard()?.tools.includes(this) &&
      !effect.attacks.includes(this.attacks[0])
    ) {
      if (
        !effect.player.active
          .getPokemonCard()
          ?.attacks.some((attack) => attack.name === 'Air Slash')
      ) {
        return state;
      }

      effect.attacks.push(this.attacks[0]);
    }

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      cardList.marker.addMarker(this.FLYINIUM_Z_MARKER, this);

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      return state;
    }

    if (
      effect instanceof AbstractAttackEffect &&
      effect.target.cards.includes(this) &&
      effect.target.marker.hasMarker(this.FLYINIUM_Z_MARKER, this)
    ) {
      effect.preventDefault = true;
      return state;
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      const owner = StateUtils.findOwner(state, cardList);

      if (owner !== player) {
        cardList.marker?.removeMarker(this.FLYINIUM_Z_MARKER, this);
      }
    }

    return state;
  }
}
