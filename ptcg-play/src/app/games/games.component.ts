import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { GameInfo } from 'ptcg-server';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Observable } from 'rxjs';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Router } from '@angular/router';

import { SessionService } from '../shared/session/session.service';
import { MatchmakingLobbyComponent } from './matchmaking-lobby/matchmaking-lobby.component';
import { ProfileService } from '../api/services/profile.service';
import { GameService } from '../api/services/game.service';
import { FriendsService } from '../api/services/friends.service';
import { Format } from 'ptcg-server';
import { ReconnectionDialogComponent } from '../shared/components/reconnection-dialog/reconnection-dialog.component';
import { ToolbarService } from '../shared/services/toolbar.service';

@UntilDestroy()
@Component({
  selector: 'ptcg-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
  providers: []
})
export class GamesComponent implements OnInit, OnDestroy {
  @ViewChild(MatchmakingLobbyComponent) matchmakingLobby: MatchmakingLobbyComponent;
  title = 'ptcg-play';

  displayedColumns: string[] = ['id', 'turn', 'player1', 'player2', 'actions'];
  public games$: Observable<GameInfo[]>;
  public loading = false;
  public lobbyComponent = MatchmakingLobbyComponent;
  public selectedFormat: Format | null = null;
  public isDevelopmentMode = true; // Set to false in production
  public sidebarOpen = false;

  constructor(
    private dialog: MatDialog,
    private sessionService: SessionService,
    private router: Router,
    private profileService: ProfileService,
    private gameService: GameService,
    private friendsService: FriendsService,
    private toolbarService: ToolbarService
  ) {
    this.games$ = this.sessionService.get(session => session.games);
  }

  ngOnInit() {
    // Component initialization
  }

  ngOnDestroy() {
    // Component cleanup
  }

  public toggleSidebar(): void {
    // Close toolbar menu if it's open
    this.toolbarService.closeMenu();
    this.sidebarOpen = !this.sidebarOpen;
  }

  public closeSidebar(): void {
    this.sidebarOpen = false;
  }

  public openSelfPlay() {
    this.closeSidebar();
    this.router.navigate(['/games/self-play']);
  }

  public createGame(invitedId?: number) {
    this.closeSidebar();
    if (invitedId) {
      this.router.navigate(['/games/create', invitedId]);
    } else {
      this.router.navigate(['/games/create']);
    }
  }

  // Handle format selection from matchmaking lobby
  onFormatSelected(format: Format): void {
    this.selectedFormat = format;
  }

  // Development method to test reconnection dialog
  public openReconnectionDialog(testType: 'progress' | 'manual' | 'error'): void {
    let dialogData: any = {};

    switch (testType) {
      case 'progress':
        dialogData = {
          gameId: 12345,
          showManualOptions: false
        };
        break;
      case 'manual':
        dialogData = {
          gameId: 12345,
          showManualOptions: true
        };
        break;
      case 'error':
        dialogData = {
          gameId: 12345,
          showManualOptions: true,
          error: 'Connection timeout exceeded'
        };
        break;
    }

    const dialogRef = this.dialog.open(ReconnectionDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: true,
      panelClass: 'reconnection-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        switch (result.action) {
          case 'reconnected':
            break;
          case 'return_to_menu':
            break;
        }
      }
    });
  }
}