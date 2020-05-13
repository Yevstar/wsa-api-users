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
import { paginationData, stringTONumber, isArrayEmpty } from "../utils/Utils";
@Service()
export default class UserService extends BaseService<User> {

    modelName(): string {
        return User.name;
    }

    public async findByEmail(email: string): Promise<User> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .andWhere('LOWER(user.email) = :email and user.isDeleted = 0', {email: email.toLowerCase()})
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
            .andWhere('LOWER(user.email) = :email and user.password = :password and isDeleted = 0',
                {email: email.toLowerCase(), password: password})
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
          'select u.id as id, LOWER(u.email) as email, u.firstName as firstName,\n' +
              'u.lastName as lastName, u.mobileNumber as mobileNumber,\n' +
              'u.genderRefId as genderRefId, u.marketingOptIn as marketingOptIn,\n' +
              'u.photoUrl as photoUrl, u.password as password,\n' +
              'u.dateOfBirth as dateOfBirth, u.firebaseUID as firebaseUID,\n' +
              'u.statusRefId as statusRefId\n' +
              'from wsa_users.user u \n' +
              'where u.id in (?);'
          , [ids]);
    }

    public async findUserFullDetailsById(id: number): Promise<User> {
      return await this.entityManager.query(
          'select * from wsa_users.user user where user.id = ?;'
          , [id]);
    }

    public async userExist(email: string): Promise<number> {
        return this.entityManager.createQueryBuilder(User, 'user')
            .where('LOWER(user.email) = :email', {email: email.toLowerCase()})
            .getCount()
    }

    public async update(email: string, user: User) {
        return this.entityManager.createQueryBuilder(User, 'user')
            .update(User)
            .set(user)
            .andWhere('LOWER(user.email) = :email', {email: email.toLowerCase()})
            .execute();
    }

    public async updatePhoto(userId: number, photoUrl: string) {
        return this.entityManager.createQueryBuilder(User, 'user')
            .update(User)
            .set({photoUrl: photoUrl})
            .andWhere('user.id = :userId', {userId})
            .execute();
    }

    public async friendDashboard(requestBody: any){
        try{
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let result = await this.entityManager.query("call wsa_users.usp_friend_dashboard(?,?,?)",[requestBody.yearRefId, limit, offset]);

            if (isArrayEmpty(result[1])) {
                let totalCount = result[0].find(x=>x).totalCount;
                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
                responseObject["friends"] = result[1];
                return responseObject;
            }
            else
            return [];
        }catch(error){
            throw error
        }
    }

    public async referFriendDashboard(requestBody: any){
        try{
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let result = await this.entityManager.query("call wsa_users.usp_refer_friend_dashboard(?,?,?)",[requestBody.yearRefId, limit, offset]);
           
            if (isArrayEmpty(result[1])) {
                let totalCount = result[0].find(x=>x).totalCount;
                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
                responseObject["referFriends"] = result[1];
                return responseObject;
            }
            else
            return [];
        }catch(error){
            throw error
        }
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
            .select(['u.id as id', 'LOWER(u.email) as email', 'u.firstName as firstName', 'u.lastName as lastName',
                'u.mobileNumber as mobileNumber', 'u.genderRefId as genderRefId',
                'u.marketingOptIn as marketingOptIn', 'u.photoUrl as photoUrl',
                'u.statusRefId as statusRefId'])
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
            .select(['u.id as id', 'LOWER(u.email) as email', 'u.firstName as firstName', 'u.lastName as lastName',
                'u.mobileNumber as mobileNumber', 'u.genderRefId as genderRefId',
                'u.marketingOptIn as marketingOptIn', 'u.photoUrl as photoUrl',
                'u.firebaseUID as firebaseUID', 'u.statusRefId as statusRefId'])
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

    public async sentMail( templateObj,OrganisationName ,receiverData, password) {


        let url =process.env.liveScoresWebHost;
        logger.info(`TeamService - sendMail : url ${url}`);
        console.log("*****Template---:"+templateObj +"--"+ JSON.stringify(templateObj))
      //  let html = ``;
        let subject = templateObj.emailSubject;
        

        templateObj.emailBody = templateObj.emailBody.replace('${user.firstName}',receiverData.firstName);
        templateObj.emailBody = templateObj.emailBody.replace('${Organisation}',OrganisationName);
        templateObj.emailBody = templateObj.emailBody.replace('${user.lastName}',receiverData.lastName);
        templateObj.emailBody = templateObj.emailBody.replace('${userName}',receiverData.email.toLowerCase());
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
            to: receiverData.email.toLowerCase(),
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

    public async userPersonalDetails(userId: number, organisationUniqueKey: any){
        try{
            let result = await this.entityManager.query("call wsa_users.usp_user_personal_details(?,?)",
            [userId, organisationUniqueKey]);

            let competitionMap = new Map();
            let teamMap = new Map();
            let userMap = new Map();
            let userObj = null;
            if(result!= null)
            {
                if(isArrayEmpty(result[0]))
                {
                    for(let item of result[0])
                    {
                        let userTemp = userMap.get(item.userId);
                        let competitionTemp = competitionMap.get(item.competitionId);
                        let teamTemp = teamMap.get(item.teamId);

                        let competitionObj = {
                            competitionId: item.competitionId,
                            competitionName: item.competitionName,
                            divisionId: item.divisionId,
                            divisionName: item.divisionName,
                            teams: []
                        }
                        let teamObj = {
                            teamId: item.teamId,
                            teamName: item.teamName
                        }

                        if(userTemp == undefined)
                        {
                            userObj = {
                                userId: item.userId,
                                firstName: item.firstName,
                                middleName: item.middleName,
                                lastName: item.lastName,
                                email: item.email.toLowerCase(),
                                mobileNumber: item.mobileNumber,
                                photoUrl: item.photoUrl,
                                dateOfBirth: item.dateOfBirth,
                                postalCode: item.postalCode,
                                genderRefId: item.genderRefId,
                                gender: item.gender,
                                emergencyContactName: item.emergencyContactName,
                                emergencyContactNumber: item.emergencyContactNumber,
                                languages: item.languages,
                                nationalityRefId: item.nationalityRefId,
                                nationalityName: item.nationalityName,
                                countryName: item.countryName,
                                isDisability: item.isDisability,
                                competitions: []
                            }

                            if(competitionObj.competitionId!= null){
                                if(item.teamId!= null)
                                {
                                    competitionObj.teams.push(teamObj);
                                    teamMap.set(item.teamId, teamObj);
                                }

                                userObj.competitions.push(competitionObj);
                                competitionMap.set(item.competitionId, competitionObj)
                            }
                            userMap.set(item.userId, userObj);
                        }
                        else{
                            if(competitionTemp == undefined)
                            {
                                if(competitionObj.competitionId!= null)
                                {
                                    if(item.teamId != null)
                                    {
                                        competitionObj.teams.push(teamObj);
                                        teamMap.set(item.teamId, teamObj);
                                    }
                                    userTemp.competitions.push(competitionObj);
                                    competitionMap.set(item.competitionId, competitionObj)
                                }
                            }
                            else{
                                if(item.teamId!= null)
                                {
                                    competitionTemp.teams.push(teamObj);
                                    teamMap.set(item.teamId, teamObj);
                                }
                                if(competitionObj.divisionName!= null)
                                {
                                    competitionTemp.divisionId = competitionObj.divisionId;
                                    competitionTemp.divisionName = competitionObj.divisionName;
                                }
                            }
                        }
                    }
                }
            }

            return userObj;
        }catch(error){
            throw error;
        }
    }

    public async userPersonalDetailsByCompetition(requestBody: any){
        try{
            let userId = requestBody.userId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let result = await this.entityManager.query("call wsa_users.usp_user_personal_details_by_competition(?,?)",
            [userId, competitionUniqueKey]);
            if(isArrayEmpty(result[0]))
            {
                for(let item of result[0])
                {
                    item.friends = JSON.parse(item.friends);
                    item.referFriends = JSON.parse(item.referFriends);
                }
            }

            return result[0];
        }catch(error){
            throw error;
        }
    }

    public async userActivitiesPlayer(requestBody: any){
        try{
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let userId = requestBody.userId;
            let competitionId = requestBody.competitionId;
            let result = await this.entityManager.query("call wsa_users.usp_user_activity_player(?,?,?,?)",
            [userId, competitionId, limit, offset]);
            if(result != null){
                let totalCount = result[0].find(x => x).totalCount;
                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
                responseObject["activityPlayers"] = result[1];
                return responseObject;
            }
        }catch(error){
            throw error;
        }

    }
    public async userActivitiesParent(requestBody: any){
        try{
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let userId = requestBody.userId;
            let competitionId = requestBody.competitionId;
            let result = await this.entityManager.query("call wsa_users.usp_user_activity_parent(?,?,?,?,?)",
            [userId, competitionId, limit, offset, requestBody.organisationId]);
            if(result != null){
                let totalCount = result[0].find(x => x).totalCount;
                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
                responseObject["activityParents"] = result[1];
                return responseObject;
            }
        }catch(error){
            throw error;
        }

    }

    public async userActivitiesScorer(requestBody: any){
        try{
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let userId = requestBody.userId;
            let competitionId = requestBody.competitionId;
            let result = await this.entityManager.query("call wsa_users.usp_user_activity_scorer(?,?,?,?)",
            [userId, competitionId, limit, offset]);
            if(result != null){
                let totalCount = result[0].find(x => x).totalCount;
                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
                responseObject["activityScorer"] = result[1];
                return responseObject;
            }
        }catch(error){
            throw error;
        }

    }

    public async userActivitiesManager(requestBody: any){
        try{
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let userId = requestBody.userId;
            let competitionId = requestBody.competitionId;
            let result = await this.entityManager.query("call wsa_users.usp_user_activity_manager(?,?,?,?)",
            [userId, competitionId, limit, offset]);
            if(result != null){
                let totalCount = result[0].find(x => x).totalCount;
                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
                responseObject["activityManager"] = result[1];
                return responseObject;
            }

        }catch(error){
            throw error;
        }

    }


    public async userRegistrationDetails(requestBody: any){
        try{
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let userId = requestBody.userId;
            let competitionId = requestBody.competitionId;
            let result = await this.entityManager.query("call wsa_users.usp_user_registration_details(?,?,?,?)",
            [limit, offset, userId, competitionId]);
            if (result != null) {
                let totalCount = result[0].find(x => x).totalCount;
                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
                let arr = [];
                if(isArrayEmpty(result[1])){
                    
                    console.log("*****************");
                    for(let item of result[1]){
                        let obj = {
                            key: item.key,
                            affiliate: item.affiliate,
                            membershipProduct: item.membershipProduct,
                            membershipType: item.membershipType,
                            feesPaid: item.feesPaid,
                            vouchers: item.vouchers,
                            shopPurchases: item.shopPurchases,
                            registrationForm: []
                        }

                        if(isArrayEmpty(result[2])){
                            let filterRes = result[2].filter(x=>x.orgRegId == item.orgRegId);
                            if(isArrayEmpty(filterRes)){
                                for(let i of filterRes){
                                    let regObj = {
                                        registrationSettingsRefId: i.registrationSettingsRefId,
                                        description: i.description,
                                        contentValue: '',
                                        friends: [],
                                        referFriends: [],
                                        playedBefore: null,
                                        volunteers: []
                                    }
                                    if(i.registrationSettingsRefId == 5){
                                        regObj.contentValue = item.playedBefore == 0 ? 'No': 'Yes';
                                        if(item.playedBefore ==  1){
                                            let objPl = {
                                                playedClub: item.playedClub,
                                                playedGrade: item.playedGrade,
                                                playedYear: item.playedYear,
                                            }
                                            regObj.playedBefore = objPl;
                                        }
                                        obj.registrationForm.push(regObj);
                                    }
                                    else if(i.registrationSettingsRefId == 6){
                                        regObj.contentValue = item.positionId1!= null ? item.positionId1 : ''  + ',' + 
                                                    item.positionId2!= null ? item.positionId2 : '' ;
                                        obj.registrationForm.push(regObj);
                                    }
                                    else if(i.registrationSettingsRefId == 7){
                                        regObj.contentValue = item.lastCaptainName;
                                        obj.registrationForm.push(regObj);
                                    }
                                    else if(i.registrationSettingsRefId == 8){
                                        if(isArrayEmpty(result[3])){
                                            let filteredFriend = result[3].filter(x=>x.playerId == item.playerId && x.friendRelationshipTypeRefId == 0);
                                            if(isArrayEmpty(filteredFriend)){
                                                regObj.friends = filteredFriend;
                                            }
                                        }
                                        obj.registrationForm.push(regObj);
                                    }
                                    else if(i.registrationSettingsRefId == 9){
                                        if(isArrayEmpty(result[3])){
                                            let filteredFriend = result[3].filter(x=>x.playerId == item.playerId && x.friendRelationshipTypeRefId == 1);
                                            if(isArrayEmpty(filteredFriend)){
                                                regObj.referFriends = filteredFriend;
                                            }
                                        }
                                        obj.registrationForm.push(regObj);
                                    }
                                    else if(i.registrationSettingsRefId == 11){
                                        regObj.contentValue = item.isConsentPhotosGiven == 1 ? "Yes": "No";
                                        obj.registrationForm.push(regObj);
                                    }
                                    else if(i.registrationSettingsRefId == 12){
                                        if(isArrayEmpty(result[4])){
                                            let volunteers = result[4].filter(x=>x.regMasterId == item.regMasterId);
                                            if(isArrayEmpty(volunteers)){
                                                regObj.volunteers = volunteers;
                                            }
                                        }
                                        obj.registrationForm.push(regObj);
                                    }
                                    else if(i.registrationSettingsRefId == 10){
                                        regObj.contentValue = item.favouriteTeamName;
                                        regObj["favouriteFireBird"] = item.favouriteFireBird;
                                        obj.registrationForm.push(regObj);
                                    }
                                }
                            }
                        }
                        arr.push(obj);
                    }
                }
                responseObject["registrationDetails"] = arr;
                return responseObject;
            }
        }catch(error){
            throw error;
        }
    }
}
