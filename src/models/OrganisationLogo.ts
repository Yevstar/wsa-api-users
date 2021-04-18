import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsNumber, IsString, IsDate } from 'class-validator';

@Entity('organisationLogo', { database: 'wsa_users' })
export class OrganisationLogo extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsNumber()
  @Column()
  organisationId: number;

  @IsString()
  @Column()
  logoUrl: string;

  @IsNumber()
  @Column()
  isDefault: number;

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
