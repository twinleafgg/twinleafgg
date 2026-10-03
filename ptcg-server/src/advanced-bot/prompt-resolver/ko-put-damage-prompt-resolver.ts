import { Player, State, Action, ResolvePromptAction, Prompt } from '../../game';
import { PromptResolver } from '../../simple-bot/prompt-resolver/prompt-resolver';
import { PutDamagePrompt } from '../../game/store/prompts/put-damage-prompt';
import { optimizePutDamage } from './put-damage-optimizer';

export class KoPutDamagePromptResolver extends PromptResolver {

  public resolvePrompt(state: State, player: Player, prompt: Prompt<any>): Action | undefined {
    if (prompt instanceof PutDamagePrompt) {
      const result = optimizePutDamage(state, prompt);
      return new ResolvePromptAction(prompt.id, result);
    }
  }

}
