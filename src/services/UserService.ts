import {Service} from "typedi";
import {User} from "../models/User";
import BaseService from "./BaseService";
import {RoleFunction} from "../models/security/RoleFunction";
import {Function} from "../models/security/Function";
import {Role} from "../models/security/Role";
import {EntityType} from "../models/security/EntityType";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {LinkedEntities} from "../models/views/LinkedEntities";
import {Brackets} from "typeorm";
import { logger } from "../logger";
import nodeMailer from "nodemailer";
import { paginationData, stringTONumber } from "../utils/Utils";
@Service()
export default class UserService extends BaseService<User> {

    modelName(): string {
        return User.name;
    }

    public async findByEmail(email: string): Promise<User> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .andWhere('LOWER(user.email) = :email', {email: email})
            .addSelect("user.password").addSelect("user.reset")
            .getOne();
    }

    public async DeleteUser(userId: number){
        return this.entityManager.createQueryBuilder(User, 'user')
        .update(User)
        .set({isDeleted: 1, updatedBy: userId, updatedOn: new Date()})
        .andWhere('user.id = :userId', {userId})
        .execute();
    }

    public async findByCredentials(email: string, password: string): Promise<User> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .andWhere('LOWER(user.email) = :email and user.password = :password',
                {email: email, password: password})
            .getOne();
    }

    public async findByFullName(name: string): Promise<User[]> {
        let builder = this.entityManager.createQueryBuilder(User, 'user')
            .where('LOWER(user.firstName) like :query', {query: `${name.toLowerCase()}%`})
            .orWhere('LOWER(user.lastName) like :query', {query: `${name.toLowerCase()}%`});
        return builder.getMany();
    }

    public async findByTeamId(teamId: number): Promise<User[]> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .innerJoin('scorers', 'scorers', 'scorers.userId = user.id')
            .innerJoin('team', 'team', 'team.id = scorers.teamId')
            .where('scorers.teamId = :teamId', {teamId}).getMany();
    }

    public async findByToken(token: string): Promise<User> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .andWhere('user.reset = :token', {token: token})
            .addSelect("user.reset")
            .getOne();
    }

    public async findChildPlayerUserDetails(ids: number[]): Promise<User[]> {
      return await this.entityManager.query(
          'select u.id as id, u.email as email, u.firstName as firstName,\n' +
              'u.lastName as lastName, u.mobileNumber as mobileNumber,\n' +
              'u.genderRefId as genderRefId, u.marketingOptIn as marketingOptIn,\n' +
              'u.photoUrl as photoUrl, u.password as password,\n' +
              'u.dateOfBirth as dateOfBirth, u.firebaseUID as firebaseUID\n' +
              'from wsa_users.user u \n' +
              'where exists (select ure.userId from wsa_users.userRoleEntity ure \n' +
              'where ure.entityTypeId = ? \n' +
              'and ure.roleId = ? and ure.userId = u.id and exists \n' +
              '(select p.id from wsa.player p where p.id in (?) and ure.entityId = p.teamId));'
          , [EntityType.TEAM, Role.PLAYER, ids]);
    }

    public async findUserFullDetailsById(id: number): Promise<User> {
      return await this.entityManager.query(
          'select * from wsa_users.user user where user.id = ?;'
          , [id]);
    }

    public async userExist(email: string): Promise<number> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .where('user.email = :email', {email})
            .getCount()
    }

    public async update(email: string, user: User) {
        return this.entityManager.createQueryBuilder(User, 'user')
            .update(User)
            .set(user)
            .andWhere('user.email = :email', {email})
            .execute();
    }

    public async updatePhoto(userId: number, photoUrl: string) {
        return this.entityManager.createQueryBuilder(User, 'user')
            .update(User)
            .set({photoUrl: photoUrl})
            .andWhere('user.id = :userId', {userId})
            .execute();
    }

    public async getUserPermission(userId: number): Promise<any[]> {
        return this.entityManager.query(
            'select distinct r.id as id,\n' +
            '       r.name as name,\n' +
            '       (select concat(\'[\', group_concat(JSON_OBJECT(\'id\', fn.id, \'name\', fn.name)),\']\')\n' +
            '         from functionRole rf2 inner join `function` fn on rf2.functionId = fn.id ' +
            '           where rf2.roleId = r.id) as functions\n' +
            'from userRoleEntity ure\n' +
            '         inner join functionRole rf on ure.roleId = rf.roleId\n' +
            '         inner join role r on rf.roleId = r.id\n' +
            '         inner join `function` f on rf.functionId = f.id\n' +
            'where ure.userId = ? group by id, name, functions;'
            , [userId])
    }

    public async getRoles(): Promise<any[]> {
        return this.entityManager.createQueryBuilder(Role, 'r')
            .select(['r.id as id', 'r.name as name', 'r.description as description', 'r.applicableToWeb as applicableToWeb'])
            .getRawMany();
    }

    public async getRole(roleName: string): Promise<any> {
        return this.entityManager.createQueryBuilder(Role, 'r')
            .select(['r.id as id', 'r.name as name'])
            .where('r.name = :roleName', {roleName})
            .getRawOne();
    }

    public async getFunctions(): Promise<any[]> {
        return this.entityManager.createQueryBuilder(Function, 'f')
            .select(['f.id as id', 'f.name as name'])
            .getRawMany();
    }

    public async getFunctionsByRole(roleId: number): Promise<any[]> {
        return this.entityManager.createQueryBuilder(Function, 'f')
            .select(['f.id as id', 'f.name as name'])
            .innerJoin(RoleFunction, 'rf', 'rf.functionId = f.id')
            .where('rf.roleId = :roleId', {roleId})
            .getRawMany();
    }

    public async getRoleFunctions(): Promise<any[]> {
        let result = await this.entityManager.query('select r.id as id,\n' +
            '       r.name as name,\n' +
            '       (select concat(\'[\', group_concat(JSON_OBJECT(\'id\', fn.id, \'name\', fn.name)),\']\')\n' +
            '         from functionRole rf2 inner join `function` fn on rf2.functionId = fn.id ' +
            '           where rf2.roleId = r.id) as functions\n' +
            'from functionRole rf\n' +
            '         inner join role r on rf.roleId = r.id\n' +
            '         inner join `function` f on rf.functionId = f.id\n' +
            'group by id, name, functions;');

        for (let p of result) {
            p['functions'] = JSON.parse(p['functions']);
        }
        return result;
    }

    public async getEntityTypes(): Promise<any[]> {
        return this.entityManager.createQueryBuilder(EntityType, 'et')
            .select(['et.id as id', 'et.name as name'])
            .getRawMany();
    }

    public async getEntityType(entityTypeName: string): Promise<any> {
        return this.entityManager.createQueryBuilder(EntityType, 'et')
            .select(['et.id as id', 'et.name as name'])
            .where('et.name = :entityTypeName', {entityTypeName})
            .getRawOne();
    }

    public async getUserListByIds(ids: number[]): Promise<User[]> {
        return this.entityManager.createQueryBuilder(User, 'u')
            .select(['u.id as id', 'u.firstName as firstName', 'u.lastName as lastName'])
            .andWhere('u.id in (:ids)', {ids})
            .getRawMany();
    }

    public async getUsersByIdWithLinkedEntity(userId: number): Promise<any> {
        return this.entityManager.createQueryBuilder(User, 'u')
            .select(['u.id as id', 'u.email as email', 'u.firstName as firstName', 'u.lastName as lastName',
                'u.mobileNumber as mobileNumber', 'u.genderRefId as genderRefId',
                'u.marketingOptIn as marketingOptIn', 'u.photoUrl as photoUrl'])
            .addSelect('concat(\'[\', group_concat(distinct JSON_OBJECT(\'entityTypeId\', ' +
                'le.linkedEntityTypeId, \'entityId\', le.linkedEntityId, \'competitionId\', le.inputEntityId, \'name\', le.linkedEntityName)),\']\') ' +
                'as linkedEntity')
            .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
            .innerJoin(RoleFunction, 'fr', 'fr.roleId = ure.roleId')
            .innerJoin(LinkedEntities, 'le', 'le.linkedEntityTypeId = ure.entityTypeId AND ' +
                'le.linkedEntityId = ure.entityId')
            .andWhere('ure.userId = :userId', {userId})
            .andWhere('le.inputEntityTypeId = 1')
            .getRawOne();
    }

    public async getUsersBySecurity(entityTypeId: number, entityId: number, userName: string,
                                    sec: { functionId?: number, roleId?: number }): Promise<User[]> {
        let query = this.entityManager.createQueryBuilder(User, 'u')
            .select(['u.id as id', 'u.email as email', 'u.firstName as firstName', 'u.lastName as lastName',
                'u.mobileNumber as mobileNumber', 'u.genderRefId as genderRefId',
                'u.marketingOptIn as marketingOptIn', 'u.photoUrl as photoUrl', 'u.firebaseUID as firebaseUID'])
            .addSelect('concat(\'[\', group_concat(distinct JSON_OBJECT(\'entityTypeId\', ' +
                'le.linkedEntityTypeId, \'entityId\', le.linkedEntityId, \'name\', le.linkedEntityName)),\']\') ' +
                'as linkedEntity')
            .innerJoin(UserRoleEntity, 'ure', 'u.id = ure.userId')
            .innerJoin(RoleFunction, 'fr', 'fr.roleId = ure.roleId')
            .innerJoin(LinkedEntities, 'le', 'le.linkedEntityTypeId = ure.entityTypeId AND ' +
                'le.linkedEntityId = ure.entityId');

        if (sec.functionId) {
            let id = sec.functionId;
            query.innerJoin(Function, 'f', 'f.id = fr.functionId')
                .andWhere('f.id = :id', {id});
        }

        if (sec.roleId) {
            let id = sec.roleId;
            query.innerJoin(Role, 'r', 'r.id = fr.roleId')
                .andWhere('r.id = :id', {id});
        }

        query.andWhere('le.inputEntityTypeId = :entityTypeId', {entityTypeId})
            .andWhere('le.inputEntityId = :entityId', {entityId});

        if (userName) {
            query.andWhere(new Brackets(qb => {
                qb.andWhere('LOWER(u.firstName) like :query', {query: `${userName.toLowerCase()}%`})
                    .orWhere('LOWER(u.lastName) like :query', {query: `${userName.toLowerCase()}%`});
            }));
        }
        query.groupBy('u.id');
        return query.getRawMany()
    }

    public async sentMail(userData, templateObj,OrganisationName ,receiverData, password) {


        let url =process.env.liveScoresWebHost;
        logger.info(`TeamService - sendMail : url ${url}`);
      //  let html = ``;
        let subject = templateObj.emailSubject;

        templateObj.emailBody = templateObj.emailBody.replace('${user.firstName}',receiverData.firstName);
        templateObj.emailBody = templateObj.emailBody.replace('${Organisation}',OrganisationName);
        templateObj.emailBody = templateObj.emailBody.replace('${user.lastName}',receiverData.lastName);
        templateObj.emailBody = templateObj.emailBody.replace('${userName}',receiverData.email);
        templateObj.emailBody = templateObj.emailBody.replace('${password}',password);
        templateObj.emailBody = templateObj.emailBody.replace('${process.env.liveScoresWebHost}',url);


        const transporter = nodeMailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.MAIL_USERNAME, // generated ethereal user
                pass: process.env.MAIL_PASSWORD // generated ethereal password
            },

            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false
            }

        });

        const mailOptions = {
            from: {
                name: "World Sport Action",
                address: "admin@worldsportaction.com"
            },
            to: receiverData.email,
            replyTo: "donotreply@worldsportaction.com",
            subject: subject,
            html: templateObj.emailBody

        };

        logger.info(`TeamService - sendMail : mailOptions ${mailOptions}`);
        await transporter.sendMail(mailOptions, (err, info) => {
          logger.info(`TeamService - sendMail : ${err}, ${info}`);
            return Promise.resolve();
       });
    }

    public async userPersonalDetails(userId: number){
        try{
            let result = await this.entityManager.query("call wsa_users.usp_user_personal_details(?)",
            [userId]);

            return result[0].find(x=>x);
        }catch(error){

        }
    }

    public async userPersonalDetailsByCompetition(requestBody: any){
        try{
            let userId = requestBody.userId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let result = await this.entityManager.query("call wsa_users.usp_user_personal_details_by_competition(?,?)",
            [userId, competitionUniqueKey]);
            return result[0].find(x=>x);
        }catch(error){
            throw error;
        }
    }

    public async userActivitiesPlayer(requestBody: any){
        try{
            let userId = requestBody.userId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let result = await this.entityManager.query("call wsa_users.usp_user_activity_player(?,?)",
            [userId, competitionUniqueKey]);
            if(result != null)
                return result[0];
        }catch(error){
            throw error;
        }

    }
    public async userActivitiesParent(requestBody: any){
        try{
            let userId = requestBody.userId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let result = await this.entityManager.query("call wsa_users.usp_user_activity_parent(?,?)",
            [userId, competitionUniqueKey]);
            if(result != null)
                return result[0];
        }catch(error){
            throw error;
        }

    }

    public async userActivitiesScorer(requestBody: any){
        try{
            let userId = requestBody.userId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let result = await this.entityManager.query("call wsa_users.usp_user_activity_scorer(?,?)",
            [userId, competitionUniqueKey]);
            if(result != null)
                return result[0];
        }catch(error){
            throw error;
        }

    }

    public async userActivitiesManager(requestBody: any){
        try{
            let userId = requestBody.userId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let result = await this.entityManager.query("call wsa_users.usp_user_activity_manager(?,?)",
            [userId, competitionUniqueKey]);
            if(result != null)
                return result[0];
        }catch(error){
            throw error;
        }

    }

  
    public async userRegistrationDetails(requestBody: any){
        try{
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let userId = requestBody.userId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let result = await this.entityManager.query("call wsa_users.usp_user_registration_details(?,?,?,?)",
            [limit, offset, userId, competitionUniqueKey]);
            if (result != null) {
                let totalCount = result[0].find(x => x).totalCount;
                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
    
                responseObject["registrationDetails"] = result[1];
                return responseObject;
            }
        }catch(error){
            throw error;
        }
    }
}