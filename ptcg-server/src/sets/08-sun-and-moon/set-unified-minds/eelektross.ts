import { Card, CardTarget, CardType, EnergyCard, GameError, GameMessage, MoveEnergyPrompt, Player, PlayerType, PokemonCard, PowerType, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {PLAY_POKEMON_FROM_HAND_TO_BENCH, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Eelektross extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Eelektrik';
  public cardType: CardType[] = [L];
  public hp: number = 150;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Electric Swamp',
      powerType: PowerType.ABILITY,
      useFromHand: true,
      useFromHandToBench: true,
      text: 'Once during your turn (before your attack), if this Pokémon is in your hand and you have at least 4 [L] Energy cards in play, you may play this Pokémon onto your Bench. If you do, move any number of [L] Energy from your other Pokémon to this Pokémon.'
    }
  ];

  public attacks = [
    {
      name: 'Hover Over',
      cost: [L, C, C, C],
      damage: 130,
      text: 'The Defending Pokemon can\'t retreat during your opponent\'s next turn'
    }
  ];

  public set = 'UNM';
  public setNumber = '66';
  public cardImage = 'assets/cardback.png';
  public name = 'Eelektross';
  public fullName = 'Eelektross UNM';

  public canUseFromHandToBench(_store: StoreLike, _state: State, player: Player): boolean {
    const energyCards: Card[] = [];
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      cardList.cards.filter(c => (
        (c instanceof EnergyCard) && (!energyCards.includes(c)) &&
        (c.provides.includes(CardType.LIGHTNING) || c.provides.includes(CardType.ANY)))
      ).forEach(c => energyCards.push(c));
    });
    return energyCards.length >= 4;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Electric Swamp
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (!this.canUseFromHandToBench(store, state, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      PLAY_POKEMON_FROM_HAND_TO_BENCH(state, player, this, effect.target);

      // Then, prompt player to move Lightning energy from their other Pokemon to this one.
      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      const blockedMap: { source: CardTarget, blocked: number[] }[] = [];

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        // We can only move from other Pokemon to this one.
        if (card === this) { blockedFrom.push(target); }
        else { blockedTo.push(target); }

        const blocked: number[] = [];
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);
        checkProvidedEnergy.energyMap.forEach(em => {
          if (!em.provides.includes(CardType.LIGHTNING) && !em.provides.includes(CardType.ANY)) {
            const index = cardList.cards.indexOf(em.card);
            if (index !== -1 && !blocked.includes(index)) { blocked.push(index); }
          }
        });
        if (blocked.length !== 0) { blockedMap.push({ source: target, blocked }); }
      });

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: true, blockedFrom, blockedTo, blockedMap }
      ), transfers => {
        if (transfers === null) { return; }
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }
    return state;
  }
}