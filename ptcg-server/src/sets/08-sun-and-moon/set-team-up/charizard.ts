import { CardType, AttachEnergyPrompt, Card, EnergyType, GameError, GameMessage, PlayerType, PokemonCard, PowerType, ShuffleDeckPrompt, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {HAS_MARKER, IS_ABILITY_BLOCKED, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CardTarget } from '../../../game/store/actions/play-card-action';

export class Charizard extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Charmeleon';
  public cardType: CardType[] = [R];
  public hp = 150;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public powers = [{
    name: 'Roaring Resolve',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may put 2 damage counters on this Pokémon. If you do, search your deck for up to 2 [R] Energy cards and attach them to this Pokémon. Then, shuffle your deck.'
  }];

  public attacks = [
    {
      name: 'Continuous Blaze Ball',
      cost: [R, R],
      damage: 30,
      damageCalculation: '+',
      text: 'Discard all [R] Energy from this Pokémon. This attack does 50 more damage for each card you discarded in this way.'
    }
  ];

  public set: string = 'TEU';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Charizard';
  public fullName: string = 'Charizard TEU';

  public readonly ROARING_RESEOLVE_MARKER = 'ROARING_RESEOLVE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      //Once per turn
      if (HAS_MARKER(this.ROARING_RESEOLVE_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.ABILITY_BLOCKED);
      }

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.damage += 20;
        }
      });

      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() !== this) {
          blockedTo.push({
            player: PlayerType.BOTTOM_PLAYER,
            slot: cardList === player.active ? SlotType.ACTIVE : SlotType.BENCH,
            index: cardList === player.active ? 0 : player.bench.indexOf(cardList)
          });
        }
      });

      store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.deck,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        {
          min: 0,
          max: 2,
          allowCancel: false,
          blockedTo
        }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
        }

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });

      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      let totalDiscarded = 0;

      const cards: Card[] = checkProvidedEnergy.energyMap.map(e => e.card);
      const discardEnergy = new DiscardCardsEffect(effect, cards);
      discardEnergy.target = player.active;

      totalDiscarded += discardEnergy.cards.length;

      store.reduceEffect(state, discardEnergy);

      effect.damage += (totalDiscarded) * 50;
    }
    return state;
  }
}