import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsNumber, IsString } from 'class-validator';

@Entity('communicationTemplate', { database: 'wsa_common' })
export class CommunicationTemplate extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column()
  emailSubject: string;

  @IsString()
  @Column()
  emailBody: string;

  @IsNumber()
  @Column()
  createdBy: number;

  @IsNumber()
  @Column({ nullable: true, default: null })
  updatedBy: number;

  @IsNumber()
  @Column({ default: 0 })
  isDeleted: number;
}
