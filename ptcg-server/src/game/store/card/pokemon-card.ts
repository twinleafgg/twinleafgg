import { Marker } from '../state/card-marker';
import { Card } from './card';
import { SuperType, Stage, PokemonType, CardType, CardTag, Format } from './card-types';
import { Attack, Weakness, Resistance, Power } from './pokemon-types';
import { TrainerCard } from './trainer-card';

export abstract class PokemonCard extends Card {
  public superType: SuperType = SuperType.POKEMON;

  public cardType: CardType[] = [CardType.COLORLESS];

  /**
   * Deprecated. Use Card._tags instead.
   */
  public cardTag: CardTag[] = [];

  public pokemonType: PokemonType = PokemonType.NORMAL;

  public evolvesFrom: string = '';

  public evolvesTo: string[] = [];

  public evolvesToStage: Stage[] = [];

  public evolvesFromBase: string[] = [];

  public legacyFullName?: string;

  public stage: Stage = Stage.BASIC;

  public retreat: CardType[] = [];

  public hp: number = 0;

  public weakness: Weakness[] = [];

  public resistance: Resistance[] = [];

  public powers: Power[] = [];

  public attacks: Attack[] = [];

  public format: Format = Format.NONE;

  public marker = new Marker();

  public movedToActiveThisTurn = false;

  public tools: TrainerCard[] = [];

  public maxTools: number = 1;

  public archetype: CardType[] = [];

  public canAttackTwice?: boolean;

  /** This attack can't be used again until this card is played from hand again. */
  public cannotUseAttackUntilLeavesPlay?: string;

  /**
   * While this card is in play, each of the opponent's Pokémon has this Weakness.
   * An Ability — ability locks suppress it.
   */
  public whileInPlayOpponentWeakness?: CardType;

  public damageTakenLastTurn?: number = 0;

  public wasMovedToActiveThisTurn?(player: any): boolean {
    return player.movedToActiveThisTurn.includes(this.id);
  }
}

export function getPokemonCardTypes(card: PokemonCard): CardType[] {
  return card.cardType;
}

export function getPrimaryCardType(card: PokemonCard): CardType {
  return card.cardType[0] ?? CardType.COLORLESS;
}

export function pokemonHasCardType(card: PokemonCard, type: CardType): boolean {
  return getPokemonCardTypes(card).includes(type);
}

export function pokemonHasCardTypeOptional(card: PokemonCard | undefined, type: CardType): boolean {
  return card !== undefined && pokemonHasCardType(card, type);
}
