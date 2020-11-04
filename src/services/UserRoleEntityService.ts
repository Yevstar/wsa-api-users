import {Service} from "typedi";
import BaseService from "./BaseService";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {EntityType} from "../models/security/EntityType";
import {LinkedEntities} from "../models/views/LinkedEntities";
import { Role } from "../models/security/Role";
import { isArrayPopulated } from "../utils/Utils";

@Service()
export default class UserRoleEntityService extends BaseService<UserRoleEntity> {

    modelName(): string {
        return UserRoleEntity.name;
    }

    public async DeleteUre(entityId: number, userId: number, currentUserId: number){
        return this.entityManager.createQueryBuilder(UserRoleEntity, 'userRoleEntity')
        .update(UserRoleEntity)
        .set({isDeleted: 1, updatedBy: currentUserId, updatedAt: new Date()})
        .andWhere('userRoleEntity.entityId = :entityId and userRoleEntity.userId = :userId and entityTypeId = 2',
                    {entityId: entityId, userId: userId})
        .execute();
    }

    public async deleteImpersonationUre(entityId: number, userId: number, currentUserId: number){
        return this.entityManager.createQueryBuilder(UserRoleEntity, 'userRoleEntity')
          .update(UserRoleEntity)
          .set({isDeleted: 1, updatedBy: currentUserId, updatedAt: new Date()})
          .andWhere('userRoleEntity.entityId = :entityId and userRoleEntity.userId = :userId and userRoleEntity.roleId = 10',
            {entityId: entityId, userId: userId})
          .execute();
    }

    public async findByTemplateId(entityId: number): Promise<UserRoleEntity[]> {
        let query = this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
        query.select(['ure.userId','ure.id'])
        .where(' ure.entityId= :entityId and ure.entityTypeId = 2 and ure.isDeleted = 0 ', {entityId})
        let ureObj = await query.getMany()
        return ureObj;
    }

    public async findByUserAndEntityId(userId, entityId){
        let query = this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
        query.select(['ure.id'])
        .where(' ure.userId= :userId and ure.entityId= :entityId and ure.entityTypeId = 2 and ure.isDeleted = 0 ', { userId, entityId})
        let ureObj = await query.getOne()
        return ureObj;
    }

    public async findByAffiliateUser(userId){
        let query = this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
        query.select(['ure.id'])
        .where(' ure.userId= :userId and ure.entityTypeId = 2 and ure.isDeleted = 0 ', { userId})
        let ureObj = await query.getOne()
        return ureObj;
    }

    public async findByUser(userId: number): Promise<UserRoleEntity[]> {
        return this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
            .leftJoinAndSelect('ure.role', 'r')
            .leftJoinAndSelect('ure.entityType', 'et')
            .andWhere('ure.userId = :userId', {userId})
            .andWhere('ure.isDeleted = 0')
            .getMany();
    }

    public async findByParams(
        userIds: number[],
        roleIds: number[] = undefined,
        linkedEntities: LinkedEntities[] = undefined
    ): Promise<UserRoleEntity[]> {
        let query = this.entityManager.createQueryBuilder(UserRoleEntity, 'ure')
            .leftJoinAndSelect('ure.role', 'r')
            .leftJoinAndSelect('ure.entityType', 'et')
            .andWhere('ure.userId in (:userIds)', {userIds})
            .andWhere('ure.isDeleted = 0');

        if (isArrayPopulated(roleIds)) {
            query.andWhere('ure.roleId in (:roleIds)', {roleIds});
        }

        if (isArrayPopulated(linkedEntities)) {
            var entityIds = [];
            var entityTypeIds = [];
            linkedEntities.forEach((le) => {
                entityIds.push(le.linkedEntityId);
                entityTypeIds.push(le.linkedEntityTypeId);
            });

            query.andWhere('ure.entityId in (:entityIds) and ' +
                'ure.entityTypeId in (:entityTypeIds)', {
                    entityIds: entityIds,
                    entityTypeIds: entityTypeIds
                }
            );
        }

        return query.getMany();
    }
}
