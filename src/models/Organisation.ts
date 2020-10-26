import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm-plus';
import { IsNumber, IsDate, IsString } from 'class-validator';

@Entity('organisation')
export class Organisation extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    organisationUniqueKey: string;

    @IsNumber()
    @Column()
    organisationTypeRefId: number;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    street1: string;

    @IsString()
    @Column()
    street2: string;

    @IsString()
    @Column()
    suburb: string;

    @IsString()
    @Column()
    email: string;

    @IsString()
    @Column()
    phoneNo: string;

    @IsString()
    @Column()
    postalCode: string;

    @IsString()
    @Column()
    city: string;

    @IsNumber()
    @Column()
    stateRefId: number;

    @IsNumber()
    @Column()
    parentOrgId: number;

    @IsNumber()
    @Column()
    statusRefId: number;

    @IsNumber()
    @Column()
    whatIsTheLowestOrgThatCanAddChild: number;

    @IsNumber()
    @Column()
    termsAndConditionsRefId: number;

    @IsString()
    @Column()
    termsAndConditions: string;

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
