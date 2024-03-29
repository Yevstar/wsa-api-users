import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsBoolean, IsDate, IsNumber, IsString } from 'class-validator';
import { TCUserAcknowledgement } from './TCUserAcknowledgement';

@Entity()
export class User extends BaseEntity {
  @IsNumber()
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @Column()
  firstName: string;

  @IsString()
  @Column({ nullable: true, default: null })
  middleName: string;

  @IsString()
  @Column()
  lastName: string;

  @IsString()
  @Column()
  mobileNumber: string;

  @IsString()
  @Column()
  email: string;

  @IsString()
  @Column({ select: false })
  password: string;

  @IsDate()
  @Column()
  dateOfBirth: Date;

  @IsNumber()
  @Column()
  genderRefId: number;

  @IsNumber()
  @Column()
  statusRefId: number;

  @IsString()
  @Column({ select: false })
  reset: string;

  @IsBoolean()
  @Column()
  marketingOptIn: boolean;

  @IsString()
  @Column()
  photoUrl: string;

  @IsString()
  @Column()
  firebaseUID: string;

  @IsString()
  @Column()
  street1: string;

  @IsString()
  @Column()
  street2: string;

  @IsString()
  @Column()
  suburb: string;

  @IsNumber()
  @Column()
  stateRefId: number;

  @IsString()
  @Column()
  emergencyContactName: string;

  @IsString()
  @Column()
  emergencyFirstName: string;

  @IsString()
  @Column()
  emergencyLastName: string;

  @IsString()
  @Column()
  emergencyContactNumber: string;

  @IsNumber()
  @Column()
  emergencyContactRelationshipId: number;

  @IsString()
  @Column()
  postalCode: string;

  @IsDate()
  @Column()
  childrenCheckExpiryDate: Date;

  @IsString()
  @Column()
  childrenCheckNumber: string;

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

  @IsNumber()
  @Column({ default: 0 })
  isInActive: number;

  @IsNumber()
  @Column({ default: 0 })
  tfaEnabled: number;

  @IsString()
  @Column({ nullable: true, default: null, select: false })
  tfaSecret: string;

  @IsString()
  @Column({ nullable: true, default: null, select: false })
  tfaSecretUrl: string;

  @IsString()
  @Column({ nullable: true, default: null })
  stripeCustomerAccountId: string;

  @IsString()
  @Column({ nullable: true, default: null })
  stripeAccountId: string;

  @IsString()
  @Column({ select: false })
  digit_code: string;

  @IsNumber()
  @Column()
  accreditationLevelUmpireRefId?: number;

  @IsDate()
  @Column()
  accreditationUmpireExpiryDate?: Date;

  @IsNumber()
  @Column()
  accreditationLevelCoachRefId?: number;

  @IsDate()
  @Column()
  accreditationCoachExpiryDate?: Date;

  @OneToMany(type => TCUserAcknowledgement, tca => tca.user)
  TcAcknowledgements: TCUserAcknowledgement[];
}
