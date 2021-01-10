import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { Actions } from "../models/Actions";
import { isArrayPopulated } from "../utils/Utils";

@Service()
export default class ActionsService extends BaseService<Actions> {
    modelName(): string {
        return Actions.name;
    }

    public async createAction10(organisationId,  affiliateOrgId, affiliateId,userId){
        try{
            let action = new Actions()
            action.id = 0;
            action.actionMasterId = 10;
            action.affiliateId = affiliateId
            action.organisationId = organisationId;
            action.statusRefId = 1;
            action.competitionOrgId = affiliateOrgId;
            action.createdBy = userId;

            return action;
        }
        catch(error){
            throw error;
        }
    }

    public async createAction12(organisationId, compOrgId,contactId, userId){
        try{
            let action = new Actions()
            action.id = 0;
            action.actionMasterId = 12;
            action.userId = contactId;
            action.organisationId = organisationId;
            action.statusRefId = 1;
            action.competitionOrgId = compOrgId;
            action.createdBy = userId;

            return action;
        }
        catch(error){
            throw error;
        }
    }

    public async getActionDataForChildrenCheck13(userId):Promise<any>{
        try {
            let query = await this.entityManager.query(`
                select 13, tt.organisationId, tt.organisationId as competitionOrgId, tt.userId, 1
                from (
                    with ttt as (
                    select DISTINCT u.childrenCheckExpiryDate, 
                                u.id as userId, if(ure.entityTypeId = 2,  ure.entityId,0) as  orgId,
                                ure.entityTypeId, 
                                p.organisationId as playerOrgId, 
                                np.organisationId as nonPlayerOrgId,
                                co.orgId as otherOrgId,
                                c.organisationId as compOrgId
                    from wsa_users.user u 
                    inner join wsa_users.userRoleEntity ure 
                        on ure.userId = u.id and ure.isDeleted = 0
                    left join wsa_competitions.player p 
                        on p.userId = ure.userId and p.competitionId = ure.entityId and ure.entityTypeId = 1 and ure.roleId = 18
                            and p.isDeleted = 0
                    left join wsa_competitions.nonPlayer np 
                        on np.userId = ure.userId  and np.competitionId = ure.entityId and ure.entityTypeId = 1
                            and np.isDeleted = 0 and ure.roleId in(15,17)
                    left join wsa.player pl 
                        on pl.userId = ure.userId and pl.deleted_at is null 
                    left join wsa.team t 
                        on t.id = pl.teamId and t.deleted_at is null 
                    left join wsa.team t1 
                        on t1.id = ure.entityId and ure.entityTypeId = 3 and (ure.roleId = 17 or ure.roleId = 3) and t1.deleted_at is null
                    left join wsa.competitionOrganisation co 
                        on co.id = t.competitionOrganisationId or co.id = t1.competitionOrganisationId 
                    left join wsa.competition c 
                        on c.id = ure.entityId and c.deleted_at is null and ure.entityTypeId = 1 and ure.roleId in(4,5)
                    where childrenCheckExpiryDate is not null and 
                    DATE_FORMAT(childrenCheckExpiryDate, '%Y-%m-%d') < DATE_FORMAT(DATE_ADD(now(), INTERVAL 45 DAY), '%Y-%m-%d')
                    and DATE_FORMAT(childrenCheckExpiryDate, '%Y-%m-%d') > DATE_FORMAT(now(), '%Y-%m-%d')
                    and u.id = ?
                    )
                    select userId,  orgId as organisationId from ttt where orgId is not null and orgId != 0
                    union 
                    select userId, playerOrgId as organisationId from ttt where playerOrgId is not null and playerOrgId != 0
                    union 
                    select userId, nonPlayerOrgId as organisationId from ttt where nonPlayerOrgId is not null and nonPlayerOrgId != 0
                    union 
                    select userId, otherOrgId as organisationId from ttt  where otherOrgId is not null and otherOrgId != 0
                    union 
                    select userId, compOrgId as organisationId from ttt  where compOrgId is not null and compOrgId != 0
                ) as tt
                left join wsa_common.actions a 
                    on a.competitionOrgId = tt.organisationId and a.createdBy = tt.userId and a.actionMasterId = 13 and a.isDeleted = 0
                    and a.statusRefId = 1
                where a.id is null`, [userId]);
            return query;
            
        } catch (error) {
            throw error;
        }
    }

    public async getActionDataForChildrenCheck14(userId): Promise<any>{
        try {
            let query = await this.entityManager.query(`
                select 13, tt.organisationId, tt.organisationId as competitionOrgId, tt.userId, 1
                from (
                    with ttt as (
                    select DISTINCT u.childrenCheckExpiryDate, 
                                u.id as userId, if(ure.entityTypeId = 2,  ure.entityId,0) as  orgId,
                                ure.entityTypeId, 
                                p.organisationId as playerOrgId, 
                                np.organisationId as nonPlayerOrgId,
                                co.orgId as otherOrgId,
                                c.organisationId as compOrgId
                    from wsa_users.user u 
                    inner join wsa_users.userRoleEntity ure 
                        on ure.userId = u.id and ure.isDeleted = 0
                    left join wsa_competitions.player p 
                        on p.userId = ure.userId and p.competitionId = ure.entityId and ure.entityTypeId = 1 and ure.roleId = 18
                            and p.isDeleted = 0
                    left join wsa_competitions.nonPlayer np 
                        on np.userId = ure.userId  and np.competitionId = ure.entityId and ure.entityTypeId = 1
                            and np.isDeleted = 0 and ure.roleId in(15,17)
                    left join wsa.player pl 
                        on pl.userId = ure.userId and pl.deleted_at is null 
                    left join wsa.team t 
                        on t.id = pl.teamId and t.deleted_at is null 
                    left join wsa.team t1 
                        on t1.id = ure.entityId and ure.entityTypeId = 3 and (ure.roleId = 17 or ure.roleId = 3) and t1.deleted_at is null
                    left join wsa.competitionOrganisation co 
                        on co.id = t.organisationId or co.id = t1.organisationId 
                    left join wsa.competition c 
                        on c.id = ure.entityId and c.deleted_at is null and ure.entityTypeId = 1 and ure.roleId in(4,5)
                    where childrenCheckExpiryDate is not null 
                    and DATE_FORMAT(u.childrenCheckExpiryDate, '%Y-%m-%d') < DATE_FORMAT(now(), '%Y-%m-%d')
                    and u.id = ?
                    )
                    select userId,  orgId as organisationId from ttt where orgId is not null and orgId != 0
                    union 
                    select userId, playerOrgId as organisationId from ttt where playerOrgId is not null and playerOrgId != 0
                    union 
                    select userId, nonPlayerOrgId as organisationId from ttt where nonPlayerOrgId is not null and nonPlayerOrgId != 0
                    union 
                    select userId, otherOrgId as organisationId from ttt  where otherOrgId is not null and otherOrgId != 0
                    union 
                    select userId, compOrgId as organisationId from ttt  where compOrgId is not null and compOrgId != 0
                ) as tt
                left join wsa_common.actions a 
                    on a.competitionOrgId = tt.organisationId and a.createdBy = tt.userId and a.actionMasterId = 13 and a.isDeleted = 0
                    and a.statusRefId = 1
                where a.id is null`, [userId]);
            return query;
            
        } catch (error) {
            throw error;
        }
    }

    public async clearActionChildrenCheckNumber(userId, loggedInUser){
        try {
            await this.entityManager.query(`Update wsa_common.actions set isDeleted = 1, 
            updatedOn = ?, updatedBy = ?
            where createdBy = ? and actionMasterId in(13,14) and isDeleted = 0 `, 
            [new Date(), loggedInUser, userId]);

        } catch (error) {
            throw error;
        }
    }

    public async createAction13_14(organisationId, compOrgId, userId, masterId){
        try{
            let action = new Actions()
            action.id = 0;
            action.actionMasterId = masterId;
            action.organisationId = organisationId;
            action.statusRefId = 1;
            action.competitionOrgId = compOrgId;
            action.createdBy = userId;

            return action;
        }
        catch(error){
            throw error;
        }
    }
}