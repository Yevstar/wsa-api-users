import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from "typeorm";
import {IsBoolean, IsDate, IsNumber, IsString} from "class-validator";

@Entity()
export class User extends BaseEntity {

    @IsNumber()
    @PrimaryGeneratedColumn()
    id: number;

    @IsString()
    @Column()
    firstName: string;

    @IsString()
    @Column({ nullable: true, default: null })
    middleName: string;

    @IsString()
    @Column()
    lastName: string;

    @IsString()
    @Column()
    mobileNumber: string;

    @IsString()
    @Column()
    email: string;

    @IsString()
    @Column({select: false})
    password: string;

    @IsDate()
    @Column()
    dateOfBirth: Date;

    // @IsString()
    // @Column()
    // gender: string;

    @IsNumber()
    @Column()
    genderRefId: number;

    // @IsNumber()
    // @Column()
    // type: number;

    @IsString()
    @Column({select: false})
    reset: string;

    @IsBoolean()
    @Column()
    marketingOptIn: boolean;

    @IsString()
    @Column()
    photoUrl: string;

    @IsString()
    @Column()
    firebaseUID: string;

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