import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { canActivateGuard } from './can-activate.service';
import { DeckComponent } from './deck/deck.component';
import { DeckEditComponent } from './deck/deck-edit/deck-edit.component';
import { DeckStatsComponent } from './deck/deck-stats/deck-stats.component';
import { FriendsComponent } from './friends/friends.component';
import { GamesComponent } from './games/games.component';
import { CreateGamePageComponent } from './games/create-game-page/create-game-page.component';
import { SelfPlayPageComponent } from './games/self-play-page/self-play-page.component';
import { PlaySnapshotPageComponent } from './games/play-snapshot-page/play-snapshot-page.component';
import { ActiveGamesComponent } from './games/active-games/active-games.component';
import { GameHistoryComponent } from './games/game-history/game-history.component';
import { PlayersComponent } from './games/players/players.component';
import { LoginComponent } from './login/login/login.component';
import { MessagesComponent } from './messages/messages.component';
import { ProfileComponent } from './profile/profile.component';
import { SelectAvatarComponent } from './profile/select-avatar/select-avatar.component';
import { RankingComponent } from './ranking/ranking.component';
import { RegisterComponent } from './login/register/register.component';
import { ReplaysComponent } from './replays/replays.component';
import { ResetPasswordComponent } from './login/reset-password/reset-password.component';
import { SetNewPasswordComponent } from './login/set-new-password/set-new-password.component';
import { TableComponent } from './table/table.component';
import { VsScreenComponent } from './table/vs-screen/vs-screen.component';
import { TermsComponent } from './terms/terms.component';
import { MaintenanceMessageComponent } from './maintenance/maintenance-message.component';
import { SpectateComponent } from './spectate/spectate.component';
import { UiShowcaseComponent } from './ui-showcase/ui-showcase.component';

const routes: Routes = [
  { path: 'deck', component: DeckComponent, canActivate: [canActivateGuard] },
  { path: 'deck/:deckId/stats', component: DeckStatsComponent, canActivate: [canActivateGuard] },
  { path: 'deck/:deckId', component: DeckEditComponent, canActivate: [canActivateGuard] },
  { path: 'friends', component: FriendsComponent, canActivate: [canActivateGuard] },
  { path: 'games', component: GamesComponent, canActivate: [canActivateGuard] },
  { path: 'games/create', component: CreateGamePageComponent, canActivate: [canActivateGuard] },
  { path: 'games/create/:clientId', component: CreateGamePageComponent, canActivate: [canActivateGuard] },
  { path: 'games/self-play', component: SelfPlayPageComponent, canActivate: [canActivateGuard] },
  { path: 'games/active', component: ActiveGamesComponent, canActivate: [canActivateGuard] },
  { path: 'games/history', component: GameHistoryComponent, canActivate: [canActivateGuard] },
  { path: 'games/players', component: PlayersComponent, canActivate: [canActivateGuard] },
  { path: 'snapshot/:code', component: PlaySnapshotPageComponent, canActivate: [canActivateGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'message', redirectTo: 'message/', pathMatch: 'full' },
  { path: 'message/:userId', component: MessagesComponent, canActivate: [canActivateGuard] },
  { path: 'ranking', component: RankingComponent, canActivate: [canActivateGuard] },
  { path: 'spectate', component: SpectateComponent, canActivate: [canActivateGuard] },
  { path: 'register', component: RegisterComponent },
  { path: 'replays', component: ReplaysComponent, canActivate: [canActivateGuard] },
  { path: 'profile/select-avatar', component: SelectAvatarComponent, canActivate: [canActivateGuard] },
  { path: 'profile/:userId', component: ProfileComponent, canActivate: [canActivateGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, pathMatch: 'full' },
  { path: 'reset-password/:token', component: SetNewPasswordComponent },
  { path: 'vs-screen', component: VsScreenComponent },
  { path: 'table/:gameId', component: TableComponent, canActivate: [canActivateGuard] },
  { path: 'terms', component: TermsComponent },
  { path: 'ui-showcase', component: UiShowcaseComponent },
  { path: '', redirectTo: '/games', pathMatch: 'full' },
  { path: 'maintenance', component: MaintenanceMessageComponent },
  { path: 'battle-pass', loadChildren: () => import('./battle-pass/battle-pass.module').then(m => m.BattlePassModule) },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
