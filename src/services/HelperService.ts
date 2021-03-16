import { Service } from "typedi";
import {InjectManager} from "typeorm-plus-typedi-extensions";
import {EntityManager} from "typeorm-plus";

@Service()
export default class HelperService {
    @InjectManager()
    protected entityManager: EntityManager;

    public async isCompetitionOrganiser(organisationId: number, competitionId: number): Promise<boolean> {
        const competition = await this.entityManager.query(`
            SELECT * from wsa.competition c
            WHERE c.id = ?
        `, [competitionId]);

        return organisationId === competition.organisationId;
    }
}
