import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

import { User } from './user';
import { Format } from '../../game';
import { bigint } from '../transformers/bigint';
import { blob } from '../transformers/blob';

@Entity()
export class GameSnapshot extends BaseEntity {

  @PrimaryGeneratedColumn()
  public id!: number;

  @Index({ unique: true })
  @Column({ length: 16 })
  public code: string = '';

  @ManyToOne(type => User, { nullable: true })
  public user?: User;

  @Column({ nullable: true })
  public userId?: number;

  @Column()
  public player1Name: string = '';

  @Column()
  public player2Name: string = '';

  @Column()
  public format: Format = Format.STANDARD;

  @Column({ type: 'int', default: 0 })
  public turn: number = 0;

  @Column({ type: 'bigint', transformer: [bigint] })
  public created: number = Date.now();

  @Column({ type: 'bigint', transformer: [bigint] })
  public expiresAt: number = Date.now();

  @Column({ type: 'blob', transformer: [blob] })
  public snapshotData: string = '';

}
