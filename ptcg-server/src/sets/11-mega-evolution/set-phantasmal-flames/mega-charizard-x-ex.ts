import {
  CardTag,
  CardType,
  DiscardEnergyPrompt,
  EnergyCard,
  GameMessage,
  PlayerType,
  PokemonCard,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { CardTarget } from '../../../game/store/actions/play-card-action';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MegaCharizardXex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Charmeleon';
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [R];
  public hp: number = 360;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Inferno X',
      cost: [R, R],
      damage: 90,
      damageCalculation: 'x',
      text: 'Discard any amount of [R] Energy from among your Pokémon, and this attack does 90 damage for each card you discarded in this way.',
    },
  ];

  public regulationMark: string = 'I';
  public set: string = 'PFL';
  public setNumber: string = '13';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Charizard X ex';
  public fullName: string = 'Mega Charizard X ex M2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let totalEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const basicEnergyCount = cardList.cards.filter(
          (card) =>
            card.superType === SuperType.ENERGY &&
            ((card as EnergyCard).provides.includes(CardType.FIRE) ||
              (card as EnergyCard).provides.includes(CardType.ANY)),
        ).length;
        totalEnergy += basicEnergyCount;
      });

      // Create blocked map for energy that doesn't provide Fire or Any type
      const blockedFrom: CardTarget[] = [];
      const blockedMap: { source: CardTarget; blocked: number[] }[] = [];

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const blockedIndices: number[] = [];
        cardList.cards.forEach((energyCard, index) => {
          if (energyCard.superType === SuperType.ENERGY) {
            // Block energy that doesn't provide Fire or Any type
            if (
              !(energyCard as EnergyCard).provides.includes(CardType.FIRE) &&
              !(energyCard as EnergyCard).provides.includes(CardType.ANY)
            ) {
              blockedIndices.push(index);
            }
          }
        });
        if (blockedIndices.length > 0) {
          blockedMap.push({ source: target, blocked: blockedIndices });
        }
      });

      return store.prompt(
        state,
        new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH], // Card source is target Pokemon
          { superType: SuperType.ENERGY },
          { min: 1, max: totalEnergy, allowCancel: false, blockedFrom, blockedMap },
        ),
        (transfers) => {
          if (transfers === null) {
            return;
          }

          for (const transfer of transfers) {
            let totalDiscarded = 0;

            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = player.discard;
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });

            totalDiscarded = transfers.length;

            effect.damage = totalDiscarded * 90;
          }
          return state;
        },
      );
    }
    return state;
  }
}
