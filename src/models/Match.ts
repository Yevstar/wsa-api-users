import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, DeleteDateColumn } from 'typeorm-plus';
import { IsBoolean, IsDate, IsNumber, IsString, IsJSON } from 'class-validator';
import { Roster } from './security/Roster';

@Entity({ database: 'wsa' })
export class Match extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column()
  team1Score: number;

  @IsNumber()
  @Column()
  team2Score: number;

  @IsNumber()
  @Column()
  venueCourtId: number;

  @IsNumber()
  @Column()
  competitionId: number;

  @IsNumber()
  @Column()
  divisionId: number;

  @IsNumber()
  @Column()
  team1Id: number;

  @IsNumber()
  @Column()
  team2Id: number;

  @IsDate()
  @Column()
  startTime: Date;

  @IsString()
  @Column()
  type: 'FOUR_QUARTERS' | 'TWO_HALVES' | 'SINGLE_PERIOD';

  @IsNumber()
  @Column()
  matchDuration: number;

  @IsNumber()
  @Column()
  breakDuration: number;

  @IsNumber()
  @Column()
  mainBreakDuration: number;

  @IsString()
  @Column()
  scorerStatus: 'SCORER1' | 'SCORER2';

  @IsString()
  @Column()
  mnbMatchId: string;

  @IsBoolean()
  @Column()
  mnbPushed: boolean;

  @IsBoolean()
  @Column()
  matchEnded: boolean;

  @IsString()
  @Column()
  matchStatus: 'STARTED' | 'PAUSED' | 'ENDED';

  @IsDate()
  @Column()
  endTime: Date;

  @IsNumber()
  @Column()
  team1ResultId: number;

  @IsNumber()
  @Column()
  team2ResultId: number;

  @IsNumber()
  @Column()
  roundId: number;

  @IsDate()
  @Column()
  originalStartTime: Date;

  @IsDate()
  @Column()
  pauseStartTime: Date;

  @IsNumber()
  @Column()
  totalPausedMs: number;

  @IsString()
  @Column()
  centrePassStatus: 'TEAM1' | 'TEAM2';

  @IsString()
  @Column()
  centrePassWonBy: 'TEAM1' | 'TEAM2';

  @DeleteDateColumn({ nullable: true, default: null, name: 'deleted_at' })
  public deleted_at: Date;

  @IsDate()
  @Column()
  created_at: Date;

  @IsDate()
  @Column()
  updated_at: Date;

  @IsString()
  @Column()
  livestreamURL: string;

  @IsString()
  @Column()
  resultStatus: 'Draft' | 'Unconfirmed' | 'In Dispute' | 'Final';

  @IsDate()
  @Column()
  extraStartTime: Date;

  @IsDate()
  @Column()
  extraExtraStartTime: Date;

  @IsNumber()
  @Column()
  extraTimeDuration: number;

  @IsNumber()
  @Column()
  extraTimeBreak: number;

  @IsNumber()
  @Column()
  extraTimeMainBreak: number;

  @IsString()
  @Column()
  extraTimeType: 'FOUR_QUARTERS' | 'TWO_HALVES' | 'SINGLE_PERIOD';

  @IsBoolean()
  @Column()
  isFinals: boolean;

  @IsNumber()
  @Column()
  extraTimeWinByGoals: number;

  @IsJSON()
  @Column('json')
  additionalDetails?: Record<string, any>;

  rosters: Roster[];
}
