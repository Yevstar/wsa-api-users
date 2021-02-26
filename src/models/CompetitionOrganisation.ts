import {
    BaseEntity,
    Column,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn
} from "typeorm-plus";
import { IsNumber } from "class-validator";

@Entity('competitionOrganisation', { database: process.env.MYSQL_DATABASE_WSA })
export class CompetitionOrganisation extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsNumber()
    @Column()
    orgId: number;

    @IsNumber()
    @Column()
    competitionId: number;

    @DeleteDateColumn({ nullable: true, default: null, name: 'deleted_at' })
    public deleted_at: Date;

}
