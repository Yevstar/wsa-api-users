import {Inject} from "typedi";
import ClubService from "../services/ClubService";
import FirebaseService from "../services/FirebaseService";
import UserRoleEntityService from "../services/UserRoleEntityService";
import UserService from "../services/UserService";
import UserDeviceService from "../services/UserDeviceService";
import {User} from "../models/User";
import AffiliateService from "../services/AffiliatesService";
import OrganisationService from "../services/OrganisationService";
import OrganisationLogoService from "../services/OrganisationLogoService";
import CommunicationTemplateService from "../services/CommunicationTemplateService";
import UserDashboardService from "../services/userDashboardService";
import UserRegistrationService from "../services/UserRegistrationService";
import admin from "firebase-admin";

export class BaseController {

    @Inject()
    protected clubService: ClubService;

    @Inject()
    protected firebaseService: FirebaseService;

    @Inject()
    protected ureService: UserRoleEntityService;

    @Inject()
    protected userService: UserService;

    @Inject()
    protected userRegistrationService: UserRegistrationService;

    @Inject()
    protected deviceService: UserDeviceService;

    @Inject()
    protected affiliateService: AffiliateService;

    @Inject()
    protected communicationTemplateService: CommunicationTemplateService;

    @Inject()
    protected organisationService: OrganisationService;

    @Inject()
    protected organisationLogoService: OrganisationLogoService;

    @Inject()
    protected userDashboardService: UserDashboardService;

    protected async updateFirebaseData(user: User, password: string) {
        user.password = password;
        let fbUser = await this.firebaseService.loadUserByUID(user.firebaseUID);
        if (!fbUser || !fbUser.uid) {
            fbUser = await this.firebaseService.createUser(user.email, password);
        } else {
            fbUser = await this.firebaseService.updateUserByUID(user.firebaseUID, user.email, user.password);
        }
        if (fbUser && fbUser.uid) {
            user.firebaseUID = fbUser.uid;
            await User.save(user);
        }

        if (user.firebaseUID) {
          await this.checkFirestoreDatabase(user, true);
        }
    }

    protected async checkFirestoreDatabase(user, update = false) {
        if (user.firebaseUID) {
          let db = admin.firestore();
          let usersCollectionRef = await db.collection('users');
          let queryRef = usersCollectionRef.where('uid', '==', user.firebaseUID);
          let querySnapshot = await queryRef.get();
          if (querySnapshot.empty) {
            usersCollectionRef.doc(user.firebaseUID).set({
                'avatar': user.photoUrl,
                'email': user.email,
                'name': `${user.firstName} ${user.lastName}`,
                'uid': user.firebaseUID,
                'searchKeywords': [
                    `${user.firstName} ${user.lastName}`,
                    user.firstName,
                    user.lastName,
                ],
            });
          } else if (update) {
            usersCollectionRef.doc(user.firebaseUID).update({
              'avatar': user.photoUrl,
              'email': user.email,
              'name': `${user.firstName} ${user.lastName}`,
              'uid': user.firebaseUID,
              'searchKeywords': [
                  `${user.firstName} ${user.lastName}`,
                  user.firstName,
                  user.lastName,
              ],
            });
          }
        }
    }
}
