import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsNumber, IsString, IsBoolean, IsDate } from 'class-validator';

@Entity('communication', { database: 'wsa_common' })
export class Communication extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column()
  author: string;

  @IsString()
  @Column()
  body: string;

  @IsString()
  @Column()
  imageUrl: string;

  @IsString()
  @Column()
  videoUrl: string;

  @IsDate()
  @Column()
  expiryDate: Date;

  @IsNumber()
  @Column()
  createdBy: number;

  @IsNumber()
  @Column()
  createdOn: Date;

  @IsBoolean()
  @Column()
  isActive: boolean;

  @IsNumber()
  @Column({ default: 0 })
  isDeleted: number;

  @IsBoolean()
  @Column()
  isNotification: boolean;

  @IsNumber()
  @Column()
  organisationId: number;

  @IsDate()
  @Column()
  publishedAt: Date;

  @IsString()
  @Column()
  title: string;

  @IsString()
  @Column({ nullable: true, default: null })
  toOrganisationIds: string;

  @IsString()
  @Column()
  toUserRoleIds: string;

  @IsString()
  @Column()
  toUserIds: string;

  @IsNumber()
  @Column({ nullable: true, default: null })
  updatedBy: number;

  @IsDate()
  @Column({ nullable: true, default: null })
  updatedOn: Date;

  @IsNumber()
  @Column()
  userId: number;
}
