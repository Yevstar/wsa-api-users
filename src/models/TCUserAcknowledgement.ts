import {BaseEntity, Entity, ManyToOne, PrimaryColumn} from "typeorm-plus";
import {TC} from "./TC";
import {User} from "./User";

@Entity()
export class TCUserAcknowledgement extends BaseEntity {
    @PrimaryColumn()
    tcId!: number;

    @PrimaryColumn()
    userId!: number;

    @ManyToOne(type => TC)
    tc: TC;

    @ManyToOne(type => User)
    user: User;
}
