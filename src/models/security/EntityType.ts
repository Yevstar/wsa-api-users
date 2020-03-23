import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm";
import {IsDate, IsNumber, IsString} from "class-validator";

@Entity('entityType')
export class EntityType extends BaseEntity {

    public static COMPETITION = 1;
    public static CLUB = 2;
    public static TEAM = 3;
    public static USER = 4;
    public static PLAYER = 5;

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: string;

    @IsDate()
    @Column({name: 'createdOn'})
    createdAt: Date;

    @IsDate()
    @Column({name: 'updatedOn'})
    updatedAt: Date;
}