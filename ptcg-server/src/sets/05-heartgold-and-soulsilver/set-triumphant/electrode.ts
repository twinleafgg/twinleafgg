import { CardType, AttachEnergyPrompt, CardList, GameMessage, PlayerType, PokemonCard, PokemonCardList, PowerType, ShowCardsPrompt, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, MOVE_CARDS, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Electrode extends PokemonCard {
  public stage = Stage.STAGE_1;
  public evolvesFrom = 'Voltorb';
  public cardType: CardType[] = [L];
  public hp = 90;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Energymite',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may use this power. If you do, Electrode is Knocked Out. Look at the top 7 cards of your deck. Choose as many Energy cards as you like and attach them to your Pokémon in any way you like. Discard the other cards. This power can\'t be used if Electrode is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Gigashock',
    cost: [L, C],
    damage: 30,
    text: 'Does 10 damage to 2 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'TM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';
  public name: string = 'Electrode';
  public fullName: string = 'Electrode TM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      ABILITY_USED(player, this);

      const thisCardList = StateUtils.findCardList(state, effect.card) as PokemonCardList;
      thisCardList.damage += 9990;

      const temp = new CardList();

      MOVE_CARDS(store, state, player.deck, temp, { count: 7, sourceCard: this });
      // Check if any cards drawn are basic energy
      const energyCardsDrawn = temp.cards.filter(card => {
        return card.superType === SuperType.ENERGY;
      });

      // If no energy cards were drawn, move all cards to deck & shuffle
      if (energyCardsDrawn.length == 0) {

        store.prompt(state, [new ShowCardsPrompt(
          player.id,
          GameMessage.CARDS_SHOWED_BY_EFFECT,
          temp.cards
        )], () => {
          temp.cards.forEach(card => {
            MOVE_CARDS(store, state, temp, player.discard, { cards: [card] });
            return state;
          });
          return state;
        });
      }

      if (energyCardsDrawn.length >= 1) {

        // Prompt to attach energy if any were drawn
        return store.prompt(state, new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          temp, // Only show drawn energies
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { min: 0, max: energyCardsDrawn.length }
        ), transfers => {

          // Attach energy based on prompt selection
          if (transfers) {
            for (const transfer of transfers) {
              const target = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, temp, target, { cards: [transfer.card], sourceCard: this }); // Move card to target
            }
            temp.cards.forEach(card => {
              MOVE_CARDS(store, state, temp, player.discard, { cards: [card] });
            });
          }
          return state;
        });
      }
    }
    return state;
  }
}
