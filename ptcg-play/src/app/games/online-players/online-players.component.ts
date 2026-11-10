import { Component, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { ClientInfo } from 'ptcg-server';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError, startWith } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { AlertService } from '../../shared/alert/alert.service';
import { SessionService } from '../../shared/session/session.service';
import { UserInfoMap } from '../../shared/session/session.interface';
import { FriendsService } from '../../api/services/friends.service';
import { ProfileService } from '../../api/services/profile.service';
import { PlaySnapshotPopupService } from '../play-snapshot-popup/play-snapshot-popup.service';
import { TranslateService } from '@ngx-translate/core';

@UntilDestroy()
@Component({
  selector: 'ptcg-online-players',
  templateUrl: './online-players.component.html',
  styleUrls: ['./online-players.component.scss']
})
export class OnlinePlayersComponent implements OnInit, OnDestroy {
  @Output() createGameRequested = new EventEmitter<number>();
  @Output() selfPlayRequested = new EventEmitter<void>();

  public clients$: Observable<ClientInfo[]>;
  public friendsList$: Observable<any[]>;
  public nonFriendClients$: Observable<ClientInfo[]>;
  public loading = false;
  public clientId: number;
  public loggedUserId: number;
  public isAdmin$: Observable<boolean>;

  constructor(
    private alertService: AlertService,
    private sessionService: SessionService,
    private friendsService: FriendsService,
    private profileService: ProfileService,
    private playSnapshotPopupService: PlaySnapshotPopupService,
    private translate: TranslateService,
    private router: Router
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

    // Initialize friends list with proper error handling
    this.friendsList$ = this.friendsService.getFriendsList().pipe(
      map(response => {
        if (!response.friends) return [];

        // Extract friend users - need to determine which user is the friend
        return response.friends
          .filter(friendInfo => friendInfo.status === 'accepted')
          .map(friendInfo => {
            // Determine which user is the friend (not the current user)
            const currentUserId = this.sessionService.session.loggedUserId;
            const friendUser = friendInfo.user.userId === currentUserId
              ? friendInfo.friend
              : friendInfo.user;

            return {
              userId: friendUser.userId,
              name: friendUser.name,
              ranking: friendUser.ranking,
              roleId: friendUser.roleId,
              avatarFile: friendUser.avatarFile
            };
          });
      }),
      catchError(error => {
        return of([]); // Return empty array on error
      }),
      startWith([]) // Start with empty array while loading
    );

    // Filter out friends from the clients list
    this.nonFriendClients$ = combineLatest([
      this.clients$,
      this.friendsList$
    ]).pipe(
      map(([clients, friends]) => {
        const friendUserIds = friends.map(friend => friend.userId);
        const filtered = clients.filter((client: any) =>
          !friendUserIds.includes(client.user?.userId)
        );
        return filtered;
      })
    );
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

  ngOnDestroy() {
    // Cleanup handled by UntilDestroy
  }

  public isPlayerOnline(userId: number): boolean {
    const session = this.sessionService.session;
    if (!session.clients) return false;

    return session.clients.some(client => client.userId === userId);
  }

  public onMenuOpened(): void {
    // Handle menu opened
  }

  public onMenuClosed(): void {
    // Handle menu closed
  }

  public createGame(invitedId?: number) {
    this.createGameRequested.emit(invitedId);
  }

  public playAgainstYourself() {
    this.selfPlayRequested.emit();
  }

  public playFromSharedState() {
    this.playSnapshotPopupService.openDialog();
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
