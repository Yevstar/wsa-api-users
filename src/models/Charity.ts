import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm-plus';
import { IsNumber, IsDate, IsString } from 'class-validator';

@Entity('charity')
export class Charity extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column()
  organisationId: number;

  @IsString()
  @Column()
  name: string;

  @IsString()
  @Column('text')
  description: string;

  @IsNumber()
  @Column()
  createdBy: number;

  @IsNumber()
  @Column({ nullable: true, default: null })
  updatedBy: number;

  @IsNumber()
  @Column()
  isDeleted: number;

  @IsDate()
  @Column({ nullable: true, default: null })
  updatedOn: Date;
}
