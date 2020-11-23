import { Service } from 'typedi';

import BaseService from '../services/BaseService';
import { OrganisationSettings } from '../models/OrganisationSettings';
import { isArrayPopulated } from "../utils/Utils";

@Service()
export default class OrganisationSettingsService extends BaseService<OrganisationSettings> {
    modelName(): string {
        return OrganisationSettings.name;
    }

    public async updateBannerCount(currentUser, organisationId, numStateBanner, numCompBanner) {
        const bannerCounts = await this.entityManager.createQueryBuilder(OrganisationSettings, 'organisationSettings')
            .where('organisationId = :organisationId', { organisationId })
            .getRawMany();

        if (!isArrayPopulated(bannerCounts)) {
            await this.entityManager.createQueryBuilder(OrganisationSettings, 'organisationSettings')
                .insert()
                .values({
                    organisationId,
                    numStateBanner,
                    numCompBanner,
                    createdBy: currentUser.id,
                    updatedBy: currentUser.id,
                    updatedOn: new Date(),
                })
                .execute();
        } else {
            await this.entityManager.createQueryBuilder(OrganisationSettings, 'organisationSettings')
                .update()
                .set({
                    numStateBanner,
                    numCompBanner,
                    updatedBy: currentUser.id,
                    updatedOn: new Date(),
                })
                .where('organisationId = :organisationId', { organisationId })
                .execute();
        }

        return await this.getBannerCount(organisationId);
    }

    public async getBannerCount(organisationId) {
        const bannerCounts = await this.entityManager.createQueryBuilder(OrganisationSettings, 'organisationSettings')
            .select(['numStateBanner', 'numCompBanner'])
            .where('organisationId = :organisationId', { organisationId })
            .getRawMany();

        if (!isArrayPopulated(bannerCounts)) {
            return {
                numStateBanner: 0,
                numCompBanner: 0,
            };
        }

        return bannerCounts[0];
    }
}
