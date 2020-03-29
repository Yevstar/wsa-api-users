import { Service } from "typedi";
import BaseService from "../services/BaseService";
import { Affiliate } from "../models/Affiliate";
import { logger } from "../logger";
import { isArrayEmpty, paginationData, stringTONumber } from "../utils/Utils";
import { User } from "../models/User";


@Service()
export default class UserDashboardService extends BaseService<User> {
    modelName(): string {
        return User.name;
    }

    public async userDashboardTextualList(requestBody: any) {
        try{
            let organisationId = requestBody.organisationId;
            let yearRefId = requestBody.yearRefId;
            let competitionUniqueKey = requestBody.competitionUniqueKey;
            let roleId = requestBody.roleId;
            let genderRefId = requestBody.genderRefId;
            let linkedEntityId = requestBody.linkedEntityId;
            let postCode = requestBody.postCode;
            let searchText = requestBody.searchText;
            let limit = requestBody.paging.limit;
            let offset = requestBody.paging.offset;
            let userArr = [];
            let result = await this.entityManager.query("call wsa_users.usp_user_dashboard_textual(?,?,?,?,?,?,?,?,?,?)",
                [organisationId, yearRefId, competitionUniqueKey, roleId, genderRefId, linkedEntityId, postCode, searchText,  limit, offset]);
    
            if (result != null) {
                let totalCount = result[1].find(x=>x).totalCount;
                let responseObject = paginationData(stringTONumber(totalCount), limit, offset);
    
                let userMap = new Map();
                let roleMap = new Map();
                let linkedMap = new Map();
                let teamMap = new Map();
               
                let competitionMap = new Map();
                for (let textual of result[0]) {
                    let userTemp = userMap.get(textual.id);
                    let roleTemp = roleMap.get(textual.roleId);
                    let linkedTemp = linkedMap.get(textual.linkedEntityId);
                    let competitionTemp = competitionMap.get(textual.competitionId);
                    let teamTemp = teamMap.get(textual.teamId);
                    let roleObj = {
                        role: textual.role,
                        roleId: textual.roleId
                    }
                    let linkedObj = {
                        linked: textual.linked,
                        linkedEntityId: textual.linkedEntityId
                    }
                   
                    let competitionObj = {
                        competition: textual.competition,
                        competitionId: textual.competitionId
                    }
                    let teamObj = {
                        teamId: textual.teamId,
                        team: textual.team
                    }
   
                    if(userTemp == undefined)
                    {
                        let textualObj = {
                            userId: textual.id,
                            name: textual.name,
                            dateOfBirth: textual.dateOfBirth,
                            role: [],
                            linked: [],
                            competition: [],
                            team:[],
                            isUsed: false,
                            key: textual.id.toString()
                        }
                        textualObj.role.push(roleObj);
                        roleMap.set(textual.roleId, roleObj);
                        
                        textualObj.linked.push(linkedObj);
                        linkedMap.set(textual.linkedEntityId, linkedObj);
    
                        textualObj.competition.push(competitionObj);
                        competitionMap.set(textual.competitionId, competitionObj)
                        textualObj.team.push(teamObj);
                        teamMap.set(textual.teamId, teamObj);
    
                        userMap.set(textual.id, textualObj);
    
                        userArr.push(textualObj);
                    }
                    else {
                        if(roleTemp == undefined)
                        {
                            userTemp.role.push(roleObj);
                            roleMap.set(textual.roleId, roleObj);
                        }
                        if(linkedTemp == undefined)
                        {
                            userTemp.linked.push(linkedObj); 
                            linkedMap.set(textual.linkedEntityId, linkedObj);
                        }
                        if(competitionTemp == undefined)
                        {
                            userTemp.competition.push(competitionObj);
                            competitionMap.set(textual.competitionId, competitionObj)
                        }
                        if(teamTemp == undefined)
                        {
                            userTemp.team.push(teamObj);
                            teamMap.set(textual.teamId, teamObj);
                        }
                    }
                }
                responseObject["users"] = userArr;
                return responseObject;
            }
            else{
                return [];
            }
        }
        catch(error)
        {
            throw error;
        }
    }
}