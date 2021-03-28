import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsNumber, IsString} from "class-validator";

@Entity('organisationHierarchy', { database: "wsa_users" })
export class OrganisationHierarchy extends BaseEntity {
    @IsNumber()
    @PrimaryGeneratedColumn()
    inputOrganisationId: number;

    @IsNumber()
    @Column()
    inputOrganisationTypeRefId: number;

    @IsNumber()
    @Column()
    linkedOrganisationId: number;

    @IsString()
    @Column()
    linkedOrganisationName: string;

    @IsNumber()
    @Column()
    linkedOrganisationTypeRefId: number;
}
