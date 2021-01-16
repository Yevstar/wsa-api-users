import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm-plus";
import {Organisation} from "./Organisation";
import {TCTypeEnum} from "./enum/TCTypeEnum";
import {TCUserAcknowledgement} from "./TCUserAcknowledgement";

@Entity()
export class TC extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    organisationId!: number;

    @ManyToOne(type => Organisation)
    @JoinColumn()
    organisation: Organisation;

    @Column({
        type: "enum",
        enum: TCTypeEnum,
    })
    type: TCTypeEnum;

    @OneToMany(type => TCUserAcknowledgement, tca => tca.tc)
    acknowledgements: TCUserAcknowledgement[];
}
