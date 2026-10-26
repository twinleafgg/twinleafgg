import { CardManager } from '../cards/card-manager';
import { Card } from '../store/card/card';
import { ConstructedFormat, Format } from '../store/format/format';
import { Format as FormatId } from '../store/card/card-types';

export class FormatManager {
  private static instance: FormatManager;
  private formats: Format[] = [];

  public static getInstance(): FormatManager {
    if (!FormatManager.instance) {
      FormatManager.instance = new FormatManager();
    }
    return FormatManager.instance;
  }

  public registerFormat(format: Format): void {
    if (this.formats.some((registered) => registered.fullName === format.fullName)) {
      throw new Error(`Format already registered: ${format.fullName}`);
    }
    this.formats.push(format);
  }

  public initialize(cards: Card[] = CardManager.getInstance().getAllCards()): void {
    for (const format of this.formats) {
      if (!(format instanceof ConstructedFormat)) {
        continue;
      }

      const legalCards = new Map<string, Card[]>();
      for (const card of cards) {
        if (!format.isCardLegal(card, cards)) {
          continue;
        }
        const cardsWithSameName = legalCards.get(card.name) || [];
        cardsWithSameName.push(card);
        legalCards.set(card.name, cardsWithSameName);
      }
      format.legalCards = legalCards;
    }
  }

  public getFormats(): Format[] {
    return [...this.formats];
  }

  public getFormat(fullName: string): Format | undefined {
    return this.formats.find((format) => format.fullName === fullName);
  }

  public getFormatById(id: FormatId): Format | undefined {
    return this.formats.find((format) => format.formatId === id);
  }
}
