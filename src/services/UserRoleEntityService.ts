import {Service} from "typedi";
import BaseService from "./BaseService";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {EntityType} from "../models/security/EntityType";
import { Role } from "../models/security/Role";

@Service()
export default class UserRoleEntityService extends BaseService<UserRoleEntity> {

    modelName(): string {
        return UserRoleEntity.name;
    }

    public async DeleteUre(id: number, userId: number){
        return this.entityManager.createQueryBuilder(UserRoleEntity, 'userRoleEntity')
        .update(UserRoleEntity)
        .set({isDeleted: 1, updatedBy: userId, updatedAt: new Date()})
        .andWhere('userRoleEntity.userId = :userId', {userId})
        .execute();
    }

    public async findByTemplateId(entityId: number): Promise<UserRoleEntity[]> {
        let query = this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
        query.select(['ure.userId','ure.id'])
        .where(' ure.entityId= :entityId and ure.entityTypeId = 2 and ure.isDeleted = 0 ', {entityId})
        let ureObj = await query.getMany()
        return ureObj;
    }

    public async findByUser(userId: number): Promise<UserRoleEntity[]> {
        return this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
            .leftJoinAndSelect('ure.role', 'r')
            .leftJoinAndSelect('ure.entityType', 'et')
            .andWhere('ure.userId = :userId', {userId})
            .getMany();
    }
}
