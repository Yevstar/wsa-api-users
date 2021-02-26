import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm-plus";
import { IsNumber, IsString, IsDate } from "class-validator";

@Entity({ database: process.env.MYSQL_DATABASE_REG })
export class Competition extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column({ nullable: true, default: null })
    name: string;

    @IsString()
    @Column({ nullable: true, default: null })
    description: string;

    @IsString()
    @Column()
    competitionUniqueKey: string;

    @IsNumber()
    @Column()
    competitionTypeRefId: number;

    @IsNumber()
    @Column()
    competitionFormatRefId: number;
    
    @IsNumber()
    @Column()
    organisationId: number;
        
    @IsNumber()
    @Column()
    isQuickCompetition: number;
            
    @IsNumber()
    @Column()
    statusRefId: number;
                
    @IsNumber()
    @Column()
    yearRefId: number;

    @IsDate()
    @Column({ nullable: true, default: null })
    startDate: Date

    @IsDate()
    @Column({ nullable: true, default: null })
    endDate: Date

    @IsNumber()
    @Column({ nullable: true, default: null })
    noOfRounds: number;

    @IsDate()
    @Column({ nullable: true, default: null })
    registrationCloseDate: Date

    @IsNumber()
    @Column({ nullable: true, default: null })
    roundInDays: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    roundInHours: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    roundInMins: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    minimumPlayers: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    maximumPlayers: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    fixtureTemplateId: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    enhancedRoundRobinTypeRefId: number
    
    @IsNumber()
    @Column({ nullable: true, default: null })
    matchTypeRefId: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    finalsMatchTypeRefId: number

    @IsNumber()
    @Column({ nullable: true, default: null })
    finalTypeRefId: number

    @IsNumber()
    @Column({ default: 0 })
    drawsPublish: number;

    @IsNumber()
    @Column({ default: 0 })
    hasRegistration : number;
    
    @IsNumber()
    @Column()
    registrationRestrictionTypeRefId: number;
    
    @IsString()
    @Column()
    heroImageUrl: string;

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
