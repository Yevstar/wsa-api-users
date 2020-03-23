import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm";
import {IsBoolean, IsDate, IsNumber, IsString} from "class-validator";

@Entity('userRegistration',{ database: process.env.MYSQL_DATABASE_REG })
export class UserRegistration extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    registrationId: number;

    @IsNumber()
    @Column()
    userId: number;

    @IsString()
    @Column()
    existingMedicalCondition: string;

    @IsString()
    @Column()
    regularMedication: string;

    @IsNumber()
    @Column()
    heardByRefId: number;

    @IsString()
    @Column()
    heardByOther: string;

    @IsNumber()
    @Column()
    favouriteTeamRefId: number;

    @IsString()
    @Column()
    favouriteFireBird: string;

    @IsNumber()
    @Column()
    isConsentPhotosGiven: number;

    @IsNumber()
    @Column()
    isDisability: number;

    @IsString()
    @Column()
    languages: string;

    @IsNumber()
    @Column()
    countryRefId: number;

    @IsNumber()
    @Column()
    nationalityRefId: number;

    @IsString()
    @Column()
    lastCaptainName: string;

    @IsNumber()
    @Column()
    playedBefore: number;

    @IsString()
    @Column()
    playedYear: string;

    @IsString()
    @Column()
    playedClub: string;

    @IsString()
    @Column()
    playedGrade: string;

    @IsString()
    @Column()
    voucherLink: string;

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
