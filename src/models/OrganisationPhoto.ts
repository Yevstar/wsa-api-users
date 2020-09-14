import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm-plus";
import { IsNumber, IsString, IsDate } from "class-validator";

@Entity('organisationPhoto',{ database: "wsa_users" })
export class OrganisationPhoto extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    organisationId: number;

    @IsString()
    @Column()
    photoUrl: string;

    @IsNumber()
    @Column()
    photoTypeRefId: number;

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
