import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm-plus';
import { Role } from './Role';
import { Team } from '../Team';
import { User } from '../User';
import { IsNumber, IsBoolean } from 'class-validator';
import { Match } from '../Match';

@Entity({ database: 'wsa' })
export class Roster extends BaseEntity {
  public static STATUS_YES = 'YES';
  public static STATUS_NO = 'NO';
  public static STATUS_NONE = 'NONE';

  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(type => Role)
  @JoinColumn()
  role: Role;

  @IsNumber()
  @Column()
  roleId: number;

  @OneToOne(type => Match)
  @JoinColumn()
  match: Match;

  @IsNumber()
  @Column()
  matchId: number;

  @OneToOne(type => Team)
  @JoinColumn()
  team: Team;

  @IsNumber()
  @Column()
  teamId: number;

  @OneToOne(type => User)
  @JoinColumn()
  user: User;

  @IsNumber()
  @Column()
  userId: number;

  @IsNumber()
  @Column()
  eventOccurrenceId: number;

  @Column()
  status: 'YES' | 'NO' | 'LATER' | 'MAYBE';

  @IsBoolean()
  @Column()
  locked: boolean;

  /// We will be using this parameter for umpire sequence while creating or
  /// editing a match.
  sequence: number;
}
