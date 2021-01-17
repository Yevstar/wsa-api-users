import BaseService from "./BaseService";
import {TC} from "../models/TC";
import {Organisation} from "../models/Organisation";
import {User} from "../models/User";
import {TCUserAcknowledgement} from "../models/TCUserAcknowledgement";
import {UserRoleEntity} from "../models/security/UserRoleEntity";
import {FindConditions, In} from "typeorm-plus";
import {TCTypeEnum} from "../models/enum/TCTypeEnum";

export class TermsAndConditionsService extends BaseService<TC> {
    modelName(): string {
        return TC.name;
    }

    async findByOrganisationId(organisationId: number): Promise<TC[]> {
        return this.entityManager.find(TC, {
            where: {
                organisationId: organisationId,
            },
        })
    }

    async createForOrganisation(
        organisationId: number,
        body: TC,
    ): Promise<TC> {
        body.organisation = await this.entityManager.findOneOrFail(Organisation, organisationId);
        return this.createOrUpdate(body)
    }

    async getAcknowledgementListForUser(user: User, tcType: TCTypeEnum): Promise<any> {
        const organisationsIdList = new Set<number>();
        const organisationsHierarchy = await this.entityManager.createQueryBuilder(UserRoleEntity, "ure")
            .addSelect("lo.o1Id", "o1Id")
            .addSelect("lo.o2Id", "o2Id")
            .leftJoin("all_organisations_hierarchy", "lo", "ure.entityId = lo.o4id and ure.entityTypeId = 2")
            .leftJoin("role", "r", "ure.roleId = r.id")
            .where("ure.userId = :userId", {userId: user.id})
            .andWhere("r.applicableToWeb = 1")
            .getRawMany();

        for (const entry of organisationsHierarchy) {
            organisationsIdList.add(entry.o1Id)
            organisationsIdList.add(entry.o2Id)
        }

        if (!organisationsIdList.size) return [];

        const conditions: FindConditions<TC> = {
            organisationId: In(Array.from(organisationsIdList)),
        };

        if (!!tcType) {
            conditions.type = tcType
        }

        return Promise.all(
            (await this.entityManager.find(TC, conditions))
            .map(async tc => {
                tc.isAcknowledged = await this.isAcknowledgedBy(user, tc)
                return tc;
            })
        );
    }

    async batchAcknowledge(user: User, tcIds: number[]): Promise<TC[]> {
        const response: TC[] = [];
        for (const tcId of tcIds) {
            const tc = await this.entityManager.findOneOrFail(TC, tcId);
            const acknowledgementData = {
                userId: user.id,
                tcId: tc.id,
            };
            const acknowledgement = await this.entityManager.findOne(TCUserAcknowledgement, acknowledgementData) || await this.entityManager.create(TCUserAcknowledgement, acknowledgementData)
            await acknowledgement.save();

            tc.isAcknowledged = true;

            response.push(tc);
        }

        return response;
    }

    async isAcknowledgedBy(user: User, tc: TC): Promise<boolean> {
        const acknowledgement = await this.entityManager.findOne(TCUserAcknowledgement, {
            tcId: tc.id,
            userId: user.id,
        });
        return !!acknowledgement;
    }
}
