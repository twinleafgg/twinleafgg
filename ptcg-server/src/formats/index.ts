import { Format as FormatId } from '../game/store/card/card-types';
import { Format } from '../game/store/format/format';
import { FormatManager } from '../game/format/format-manager';
import { Standard } from './standard';

export { Standard };

export function createFormatDefinitions(): Format[] {
  return [new Standard()];
}

export function registerFormats(manager: FormatManager): void {
  const formats = createFormatDefinitions();
  const registeredIds = new Set<FormatId>();

  for (const format of formats) {
    if (registeredIds.has(format.formatId)) {
      throw new Error(`Format ID already defined: ${format.formatId}`);
    }
    registeredIds.add(format.formatId);
    manager.registerFormat(format);
  }
}
