import { Component, OnInit } from '@angular/core';
import { ClientInfo } from 'ptcg-server';
import { Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';

import { SessionService } from '../../shared/session/session.service';
import { UserInfoMap } from '../../shared/session/session.interface';
import { ProfileService } from '../../api/services/profile.service';
import { AlertService } from '../../shared/alert/alert.service';
import { DeckService } from '../../api/services/deck.service';
import { MainService } from '../../api/services/main.service';
import { GameService } from '../../api/services/game.service';

@UntilDestroy()
@Component({
  selector: 'ptcg-players',
  templateUrl: './players.component.html',
  styleUrls: ['./players.component.scss']
})
export class PlayersComponent implements OnInit {

  public clients$: Observable<ClientInfo[]>;
  public loading = false;
  public clientId: number;
  public loggedUserId: number;
  public isAdmin$: Observable<boolean>;

  constructor(
    private alertService: AlertService,
    private deckService: DeckService,
    private mainService: MainService,
    private sessionService: SessionService,
    private translate: TranslateService,
    private router: Router,
    private profileService: ProfileService,
    private gameService: GameService
  ) {
    this.clients$ = this.sessionService.get(
      session => session.users,
      session => session.clients
    ).pipe(map(([users, clients]: [UserInfoMap, ClientInfo[]]) => {
      const values = clients.map(c => ({
        ...c,
        user: users[c.userId]
      }));
      values.sort((client1, client2) => {
        return client2.user.ranking - client1.user.ranking;
      });
      return values;
    }));

    this.isAdmin$ = this.sessionService.get(session => {
      const loggedUserId = session.loggedUserId;
      const loggedUser = loggedUserId && session.users[loggedUserId];
      return loggedUser && loggedUser.roleId === 4;
    });
  }

  ngOnInit() {
    this.sessionService.get(session => session.loggedUserId)
      .pipe(untilDestroyed(this))
      .subscribe(userId => {
        this.loggedUserId = userId;
      });

    this.sessionService.get(session => session.clientId)
      .pipe(untilDestroyed(this))
      .subscribe(clientId => {
        this.clientId = clientId;
      });
  }

  public openSelfPlay() {
    this.router.navigate(['/games/self-play']);
  }

  public createGame(invitedId?: number) {
    if (invitedId) {
      this.router.navigate(['/games/create', invitedId]);
    } else {
      this.router.navigate(['/games/create']);
    }
  }

  banUser(userId: number) {
    const isBanned = this.sessionService.session.users[userId]?.roleId === 1;
    const newRoleId = isBanned ? 2 : 1; // 2 is regular user, 1 is banned
    const successMessage = isBanned ? 'PROFILE_UNBAN_SUCCESS' : 'PROFILE_BAN_SUCCESS';
    const errorMessage = isBanned ? 'PROFILE_UNBAN_ERROR' : 'PROFILE_BAN_ERROR';

    this.profileService.updateUserRole(userId, newRoleId).subscribe({
      next: () => {
        this.alertService.toast(this.translate.instant(successMessage));
        const users = { ...this.sessionService.session.users };
        if (users[userId]) {
          users[userId] = { ...users[userId], roleId: newRoleId };
          this.sessionService.set({ users });
        }
      },
      error: async error => {
        await this.alertService.error(this.translate.instant(errorMessage));
      }
    });
  }

} 