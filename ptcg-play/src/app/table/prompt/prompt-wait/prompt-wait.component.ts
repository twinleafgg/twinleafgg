import { Component, Input, OnInit } from '@angular/core';
import { LocalGameState } from '../../../shared/session/session.interface';
import { Prompt } from 'ptcg-server';
import { GameService } from '../../../api/services/game.service';
import { SKIP_WAIT_MESSAGES } from '../../self-play-background-waits';

@Component({
  selector: 'ptcg-prompt-wait',
  templateUrl: './prompt-wait.component.html',
  styleUrls: ['./prompt-wait.component.scss']
})
export class PromptWaitComponent implements OnInit {
  @Input() gameState: LocalGameState;
  @Input() prompt: Prompt<any>;

  constructor(private gameService: GameService) { }

  get waitMessage(): string | undefined {
    return (this.prompt as any)?.message;
  }

  ngOnInit() {
    const message = this.waitMessage;
    if (message && SKIP_WAIT_MESSAGES.has(message)) {
      // Resolve on next tick so the prompt is fully mounted before we clear it.
      setTimeout(() => this.resolve(), 0);
      return;
    }

    const duration = (this.prompt as any)?.duration;
    if (duration) {
      setTimeout(() => {
        this.resolve();
      }, duration);
    }
  }

  resolve() {
    if (this.gameState && this.prompt) {
      this.gameService.resolvePrompt(this.gameState.gameId, this.prompt.id, null);
    }
  }
} 