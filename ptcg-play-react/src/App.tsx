import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CardImagesProvider } from './context/CardImagesContext';
import { LanguageProvider } from './context/LanguageContext';
import { SnackbarProvider } from './context/SnackbarContext';
import { SettingsProvider } from './context/SettingsContext';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { GamesPage } from './pages/GamesPage';
import { DeckListPage } from './pages/DeckListPage';
import { DeckStatsPage } from './pages/DeckStatsPage';
import { DeckEditPage } from './pages/DeckEditPage';
import { RankingPage } from './pages/RankingPage';
import { MessagesPage } from './pages/MessagesPage';
import { BattlePassPage } from './pages/BattlePassPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { TablePage } from './pages/TablePage';
import { SpectatePage } from './pages/SpectatePage';
import { ReplaysPage } from './pages/ReplaysPage';
import { FriendsPage } from './pages/FriendsPage';
import { MyGamesPage } from './pages/MyGamesPage';
import { ParentPage } from './pages/ParentPage';
import { AdminHubPage } from './pages/admin/AdminHubPage';
import { AdminBattlePassListPage } from './pages/admin/AdminBattlePassListPage';
import { AdminBattlePassEditorPage } from './pages/admin/AdminBattlePassEditorPage';
import { AdminAvatarsPage } from './pages/admin/AdminAvatarsPage';
import { AdminSleevesPage } from './pages/admin/AdminSleevesPage';
import { AdminDeckBoxesPage } from './pages/admin/AdminDeckBoxesPage';
import { AdminCoinsPage } from './pages/admin/AdminCoinsPage';
import { UiShowcasePage } from './pages/ui-showcase/UiShowcasePage';
import { AbilityLockPage } from './pages/ability-lock/AbilityLockPage';
import { EffectlessCardsPage } from './pages/effectless-cards/EffectlessCardsPage';
import { DeckBoxPreviewPage } from './pages/deck-box-preview/DeckBoxPreviewPage';
import { DeckCustomizePage } from './pages/deck-customize/DeckCustomizePage';
import { CubeListPage } from './cube/CubeListPage';
import { CubeEditorPage } from './cube/CubeEditorPage';
import { CubeDraftRoomPage } from './cube/CubeDraftRoomPage';

function ProfileMeRedirect() {
  const { user } = useAuth();
  return <Navigate to={`/profile/${user!.userId}`} replace />;
}

function ProfilePageRoute() {
  const { userId } = useParams();
  return <ProfilePage key={userId} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
      <SnackbarProvider>
      <AuthProvider>
        <SettingsProvider>
        <CardImagesProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/ui-showcase" element={<UiShowcasePage />} />
            <Route path="/ability-lock" element={<AbilityLockPage />} />
            <Route path="/effectless-cards" element={<EffectlessCardsPage />} />
            <Route path="/deck-box-preview" element={<DeckBoxPreviewPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/games" element={<GamesPage />} />
                <Route path="/my-games" element={<MyGamesPage />} />
                <Route path="/spectate" element={<SpectatePage />} />
                <Route path="/table/replay/:matchId" element={<TablePage />} />
                <Route path="/table/saved-replay/:replayId" element={<TablePage />} />
                <Route path="/table/:gameId" element={<TablePage />} />
                <Route path="/deck" element={<DeckListPage />} />
                <Route path="/deck/:deckId/stats" element={<DeckStatsPage />} />
                <Route path="/deck/:deckId/customize" element={<DeckCustomizePage />} />
                <Route path="/deck/:deckId" element={<DeckEditPage />} />
                <Route path="/ranking" element={<RankingPage />} />
                <Route path="/replays" element={<ReplaysPage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/message" element={<MessagesPage />} />
                <Route path="/message/:userId" element={<MessagesPage />} />
                <Route path="/battle-pass" element={<BattlePassPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<ProfileMeRedirect />} />
                <Route path="/profile/:userId" element={<ProfilePageRoute />} />
                <Route path="/parent" element={<ParentPage />} />
                <Route element={<AdminRoute />}>
                  <Route path="/cube" element={<CubeListPage />} />
                  <Route path="/cube/:cubeId" element={<CubeEditorPage />} />
                  <Route path="/draft/:roomCode" element={<CubeDraftRoomPage />} />
                  <Route path="/admin" element={<AdminHubPage />} />
                  <Route path="/admin/battle-pass" element={<AdminBattlePassListPage />} />
                  <Route path="/admin/battle-pass/:seasonId" element={<AdminBattlePassEditorPage />} />
                  <Route path="/admin/avatars" element={<AdminAvatarsPage />} />
                  <Route path="/admin/sleeves" element={<AdminSleevesPage />} />
                  <Route path="/admin/deck-boxes" element={<AdminDeckBoxesPage />} />
                  <Route path="/admin/coins" element={<AdminCoinsPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="/" element={<Navigate to="/games" replace />} />
            <Route path="*" element={<Navigate to="/games" replace />} />
          </Routes>
        </CardImagesProvider>
        </SettingsProvider>
      </AuthProvider>
      </SnackbarProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
