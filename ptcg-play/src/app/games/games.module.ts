import { NgModule } from '@angular/core';

import { GamesComponent } from './games.component';
import { MatchTableComponent } from './match-table/match-table.component';
import { SharedModule } from '../shared/shared.module';
import { GameActionsComponent } from './game-actions/game-actions.component';
import { CreateGamePageComponent } from './create-game-page/create-game-page.component';
import { GamesTableComponent } from './games-table/games-table.component';
import { MatchmakingLobbyComponent } from './matchmaking-lobby/matchmaking-lobby.component';
import { ActiveGamesComponent } from './active-games/active-games.component';
import { GameHistoryComponent } from './game-history/game-history.component';
import { PlayersComponent } from './players/players.component';
import { OnlinePlayersComponent } from './online-players/online-players.component';
import { ChangeDeckDialogComponent } from './change-deck-dialog/change-deck-dialog.component';
import { SelfPlayPageComponent } from './self-play-page/self-play-page.component';

@NgModule({
    declarations: [
        GamesComponent,
        GameActionsComponent,
        MatchTableComponent,
        CreateGamePageComponent,
        GamesTableComponent,
        MatchmakingLobbyComponent,
        ActiveGamesComponent,
        GameHistoryComponent,
        PlayersComponent,
        OnlinePlayersComponent,
        ChangeDeckDialogComponent,
        SelfPlayPageComponent
    ],
    imports: [
        SharedModule
    ],
    exports: [
        MatchTableComponent,
        GamesTableComponent
    ],
    providers: []
})
export class GamesModule { }
