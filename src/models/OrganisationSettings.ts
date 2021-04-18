import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsNumber, IsDate } from 'class-validator';

@Entity('organisationSettings', { database: 'wsa_users' })
export class OrganisationSettings extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column()
  organisationId: number;

  @IsNumber()
  @Column()
  numStateBanner: number;

  @IsNumber()
  @Column()
  numCompBanner: number;

  @IsNumber()
  @Column()
  createdBy: number;

  @IsNumber()
  @Column({ nullable: true, default: null })
  updatedBy: number;

  @IsDate()
  @Column({ nullable: true, default: null })
  updatedOn: Date;

  @IsNumber()
  @Column({ default: 0 })
  isDeleted: number;
}
