import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm-plus";
import {IsDate, IsNumber, IsString} from "class-validator";

@Entity('entityType')
export class EntityType extends BaseEntity {

    public static COMPETITION = 1;
    public static ORGANISATION = 2;
    public static TEAM = 3;
    public static USER = 4;
    public static PLAYER = 5;
    public static COMPETITION_ORGANISATION = 6;

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
