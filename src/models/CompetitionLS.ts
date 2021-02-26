import {BaseEntity, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, OneToMany} from "typeorm-plus";
import {IsBoolean, IsNumber, IsString, ValidateNested, IsDate} from "class-validator";

@Entity('competition',{ database: process.env.MYSQL_DATABASE_WSA })
export class CompetitionLS extends BaseEntity {


    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    uniqueKey: string;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    longName: string;

    @IsString()
    @Column()
    logoUrl: string;

    @IsNumber()
    @Column()
    organisationId: number;

    @IsNumber()
    @Column()
    sourceId: number;

    @Column()
    linkedCompetitionId: number;

    @IsNumber()
    @Column()
    yearRefId: number;

    @IsDate()
    @Column({ nullable: true, default: null })
    deleted_at: Date;
}
