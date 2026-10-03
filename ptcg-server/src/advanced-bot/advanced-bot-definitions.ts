import {
  allSimpleTactics, defaultStateScores, defaultArbiterOptions
} from '../simple-bot/simple-bot-definitions';
import { SimpleBotOptions } from '../simple-bot/simple-bot-options';
import { AlertPromptResolver } from '../simple-bot/prompt-resolver/alert-prompt-resolver';
import { AttachEnergyPromptResolver } from '../simple-bot/prompt-resolver/attach-energy-prompt-resolver';
import { ChooseAttackPromptResolver } from '../simple-bot/prompt-resolver/choose-attack-prompt-resolver';
import { ChooseEnergyPromptResolver } from '../simple-bot/prompt-resolver/choose-energy-prompt-resolver';
import { ChoosePokemonPromptResolver } from '../simple-bot/prompt-resolver/choose-pokemon-prompt-resolver';
import { ChoosePrizePromptResolver } from '../simple-bot/prompt-resolver/choose-prize-prompt-resolver';
import { ConfirmPromptResolver } from '../simple-bot/prompt-resolver/confirm-prompt-resolver';
import { MoveDamagePromptResolver } from '../simple-bot/prompt-resolver/move-damage-prompt-resolver';
import { MoveEnergyPromptResolver } from '../simple-bot/prompt-resolver/move-energy-prompt-resolver';
import { OrderCardsPromptResolver } from '../simple-bot/prompt-resolver/order-cards-prompt-resolver';
import { SelectPromptResolver } from '../simple-bot/prompt-resolver/select-prompt-resolver';
import { SelectOptionPromptResolver } from '../simple-bot/prompt-resolver/select-option-prompt-resolver';
import { KoPutDamagePromptResolver } from './prompt-resolver/ko-put-damage-prompt-resolver';
import { PlaybookChooseCardsPromptResolver } from './prompt-resolver/playbook-choose-cards-prompt-resolver';

/** Prompt resolvers with KO-optimal PutDamage and playbook-aware ChooseCards. */
export const advancedPromptResolvers = [
  AlertPromptResolver,
  AttachEnergyPromptResolver,
  ChooseAttackPromptResolver,
  PlaybookChooseCardsPromptResolver,
  ChooseEnergyPromptResolver,
  ChoosePokemonPromptResolver,
  ChoosePrizePromptResolver,
  ConfirmPromptResolver,
  MoveDamagePromptResolver,
  MoveEnergyPromptResolver,
  OrderCardsPromptResolver,
  KoPutDamagePromptResolver,
  SelectPromptResolver,
  SelectOptionPromptResolver,
];

export const defaultAdvancedBotOptions: SimpleBotOptions = {
  tactics: allSimpleTactics,
  scores: defaultStateScores,
  promptResolvers: advancedPromptResolvers,
  arbiter: defaultArbiterOptions,
};
