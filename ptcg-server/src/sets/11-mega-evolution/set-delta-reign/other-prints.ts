import { EmceesHype } from '../../10-scarlet-and-violet/set-destined-rivals/mcs-hype-up';
import { Eevee } from './eevee';
import { Sprigatito } from './sprigatito';
import { Zorua } from './zorua';

export class EmceesHypeM6 extends EmceesHype {
  public set: string = 'DLR';
  public setNumber: string = '92';
  public regulationMark: string = 'J';
  public fullName: string = 'Emcee\'s Hype M6';
}

export class SprigatitoIR extends Sprigatito {
  public setNumber = '105';
  public fullName: string = 'SprigatitoIR MEM';
  public set = 'DLR';
}

export class ZoruaIR extends Zorua {
  public setNumber = '112';
  public fullName: string = 'ZoruaIR MEZ';
  public set = 'DLR';
}

export class EeveeIR extends Eevee {
  public setNumber = '114';
  public fullName: string = 'EeveeIR MEE';
  public set = 'DLR';
}
