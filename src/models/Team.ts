import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm-plus';
import {IsNumber, IsString} from "class-validator";

@Entity('team',{ database: "wsa" })
export class Team extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    alias: string;

    @IsNumber()
    @Column()
    divisionId: number;

    @IsNumber()
    @Column()
    competitionId: number;

    @IsNumber()
    @Column()
    competitionOrganisationId: number;
}
