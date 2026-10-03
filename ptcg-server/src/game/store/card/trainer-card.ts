import { Attack, Power } from '../../..';
import { ToolEffect } from '../effects/play-card-effects';
import { Card } from './card';
import { Format, SuperType, TrainerType } from './card-types';

export abstract class TrainerCard extends Card {
  public superType: SuperType = SuperType.TRAINER;
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public get trainerType(): TrainerType {
    // TODO: (pending format rework) If this is a tool, check for SV tool erratum and return item if not present
    return this._trainerType;
  }
  public set trainerType(value: TrainerType) {
    this._trainerType = value;
  }
  public format: Format = Format.NONE;
  public text: string = '';
  public attacks: Attack[] = [];
  public powers: Power[] = [];
  public firstTurn: boolean = false;
  public stadiumDirection: 'up' | 'down' = 'up';
  public toolEffect: ToolEffect | undefined;
  public putIntoPlay: boolean = false;
  public attachesToOpponentsPokemon: boolean = false;
}
