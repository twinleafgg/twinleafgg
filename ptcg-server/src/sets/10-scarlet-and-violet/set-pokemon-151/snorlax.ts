import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, BoardEffect } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, GameMessage, ChooseCardsPrompt, Card, PlayerType, GameError } from '../../../game';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useVoraciousness(next: Function, store: StoreLike, state: State, self: Snorlax, effect: PowerEffect): IterableIterator<State> {
  const player = effect.player;

  let cards: Card[] = [];
  const blocked: number[] = [];
  player.discard.cards.forEach((c, index) => {
    if (!(c.name === 'Leftovers'))
      blocked.push(index);
  });

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.discard,
    {},
    { min: 0, max: 2, allowCancel: false, blocked }
  ), selected => {
    cards = selected || [];
    next();
  });

  player.marker.addMarker(self.ABILITY_USED_MARKER, self);

  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
    if (cardList.getPokemonCard() === self) {
      cardList.addBoardEffect(BoardEffect.ABILITY_USED);
    }
  });

  MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: self });
}

export class Snorlax extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 150;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Voraciousness',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may put up to 2 Leftovers cards from your discard pile into your hand.'
  }];

  public attacks = [
    {
      name: 'Collapse',
      cost: [C, C, C],
      damage: 130,
      text: 'This Pokémon also does 30 damage to itself.'
    }
  ];

  public regulationMark = 'G';

  public set: string = 'MEW';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '143';

  public name: string = 'Snorlax';

  public fullName: string = 'Snorlax MEW';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.ABILITY_USED_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.ABILITY_USED_MARKER, this)) {
      const player = effect.player;
      player.marker.removeMarker(this.ABILITY_USED_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {

      if (effect.player.marker.hasMarker(this.ABILITY_USED_MARKER, this))
        throw new GameError(GameMessage.POWER_ALREADY_USED);

      const generator = useVoraciousness(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const dealDamage = new DealDamageEffect(effect, 30);
      dealDamage.target = player.active;
      return store.reduceEffect(state, dealDamage);
    }
    return state;

  }
}
