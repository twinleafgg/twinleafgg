import { HighPressureSystem } from '../03-ex-ruby-and-sapphire/set-ex-dragon/high-pressure-system';
import { LowPressureSystem } from '../03-ex-ruby-and-sapphire/set-ex-dragon/low-pressure-system';

export class HighPressureSystemP3 extends HighPressureSystem {
  public set: string = 'P3';
  public setNumber: string = '10';
  public fullName: string = 'High Pressure System P3';
}

export class LowPressureSystemP3 extends LowPressureSystem {
  public set: string = 'P3';
  public setNumber: string = '11';
  public fullName: string = 'Low Pressure System P3';
}
