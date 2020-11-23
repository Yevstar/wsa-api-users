import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm-plus";
import {IsDate, IsNumber, IsString} from "class-validator";

@Entity()
export class Role extends BaseEntity {

    public static PLAYER = 8;
    public static UMPIRE = 15;

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    name: string;

    @IsString()
    @Column()
    description: string;

    @IsNumber()
    @Column({ default: 0 })
    applicableToWeb: number;

    @IsDate()
    @Column({name: 'createdOn'})
    createdAt: Date;

    @IsDate()
    @Column({name: 'updatedOn'})
    updatedAt: Date;
}
