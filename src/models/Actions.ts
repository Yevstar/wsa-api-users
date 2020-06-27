import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';
import {IsNumber, IsDate} from "class-validator";

@Entity('actions',{ database: process.env.MYSQL_DATABASE_COMMON })
export class Actions extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    actionMasterId: number;

    @IsNumber()
    @Column()
    organisationId: number;

    @IsNumber()
    @Column()
    affiliateId : number;
    
    @IsNumber()
    @Column()
    userId : number;

    @IsNumber()
    @Column()
    competitionOrgId: number;

    @IsNumber()
    @Column()
    competitionId: number;
    
    @IsNumber()
    @Column()
    membershipProductId: number;

    @IsNumber()
    @Column()
    commentId : number;

    @IsNumber()
    @Column()
    teamId: number;

    @IsNumber()
    @Column()
    statusRefId: number;

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
