import 'reflect-metadata';
import { Connection, createConnection, EntityManager, getConnectionManager } from 'typeorm';
import {
  Avatar, Conversation, Deck, DisconnectedSession, Match, Message, Replay, GameSnapshot, User,
  BattlePassSeason, BattlePassReward, AvatarCatalog, UserBattlePass, UserUnlockedItem,
  Friend, FriendRequest, CardArtwork, UserFavoriteCard, Sleeve, DeckBox, Coin, MatchXpAward
} from './';

export class Storage {

  private connection: null | Connection = null;

  constructor() { }

  public async connect(): Promise<void> {
    const storageConfig: any = {
      type: process.env.STORAGE_TYPE,
      host: process.env.STORAGE_HOST,
      port: process.env.STORAGE_PORT,
      username: process.env.STORAGE_USERNAME,
      password: process.env.STORAGE_DATABASE_PASSWORD,
      database: process.env.STORAGE_DATABASE
    };

    const entities = [
      Avatar,
      Conversation,
      Deck,
      DisconnectedSession,
      Friend,
      FriendRequest,
      Match,
      Message,
      Replay,
      GameSnapshot,
      User,
      BattlePassSeason,
      BattlePassReward,
      AvatarCatalog,
      UserBattlePass,
      UserUnlockedItem,
      CardArtwork,
      UserFavoriteCard,
      Sleeve,
      DeckBox,
      Coin,
      MatchXpAward
    ];

    const openConnection = (name?: string, synchronize = true) => createConnection({
      ...storageConfig,
      ...(name ? { name } : {}),
      timezone: 'Z',
      entities,
      synchronize,
      logging: false
    });

    try {
      this.connection = await openConnection();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Prior failed sync may leave battle_pass_reward with an incompatible string FK on seasonId.
      if (!/foreign key constraint|incompatible/i.test(message)) {
        throw error;
      }
      console.warn('[Storage] Schema sync failed on Battle Pass FK; repairing battle_pass_reward and retrying…');
      if (getConnectionManager().has('default')) {
        try {
          await getConnectionManager().get('default').close();
        } catch {
          // ignore
        }
      }
      const repair = await openConnection('bp-schema-repair', false);
      try {
        await repair.query('DROP TABLE IF EXISTS `battle_pass_reward`');
      } finally {
        await repair.close();
      }
      this.connection = await openConnection();
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection === null) {
      return;
    }
    return this.connection.close();
  }

  public get manager(): EntityManager {
    if (this.connection === null) {
      throw new Error('Not connected to the database.');
    }
    return this.connection.manager;
  }

  public async checkConnection(): Promise<boolean> {
    if (this.connection === null) {
      return false;
    }
    try {
      await this.connection.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

}
