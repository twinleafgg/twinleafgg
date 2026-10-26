import { Card } from '../game/store/card/card';
import { Format as FormatId } from '../game/store/card/card-types';
import { ConstructedFormat } from '../game/store/format/format';
import { Erratum, GameplayRule } from '../game/store/format/format-types';
import { getFormatBanlistEntries, isStandardCardLegal } from './format-legality';

export class Standard extends ConstructedFormat {
  name = 'Standard';
  shortName = 'TEF-on';
  fullName = 'Standard';
  formatId = FormatId.STANDARD;

  gameplayRules = [GameplayRule.T1_FIRST_NO_ATTACK, GameplayRule.T1_FIRST_NO_SUPPORTER];
  banlist = getFormatBanlistEntries(FormatId.STANDARD);

  errata = [
    Erratum.TOOLS_ARE_NOT_ITEMS,
    Erratum.RARE_CANDY_NERF,
    Erratum.POTION_HEALS_30,
    Erratum.GREAT_BALL_TOP_7,
    Erratum.POKEMON_CATCHER_COIN_FLIP,
    Erratum.ENERGY_RETRIEVAL_UP_TO_2,
    Erratum.ENERGY_RECYCLER_UP_TO_5,
    Erratum.SACRED_ASH_UP_TO_5,
  ];

  isCardLegal(card: Card, allCards?: Card[]): boolean {
    return isStandardCardLegal(card, allCards, this.banlist);
  }

}
