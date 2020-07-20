import {Inject} from "typedi";
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
import OrganisationPhotoService from "../services/OrganisationPhotoService";
import ActionsService from "../services/ActionsService";

export class BaseController {

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
    protected actionsService: ActionsService;

    @Inject()
    protected communicationTemplateService: CommunicationTemplateService;

    @Inject()
    protected organisationService: OrganisationService;

    @Inject()
    protected organisationLogoService: OrganisationLogoService;

    @Inject()
    protected organisationPhotoService: OrganisationPhotoService;

    @Inject()
    protected userDashboardService: UserDashboardService;

    protected async updateFirebaseData(user: User, password: string) {
        user.password = password;

        let fbUser;
        /// If there an existing firebaseUID get the firebase user via that
        if (user.firebaseUID) {
            fbUser = await this.firebaseService.loadUserByUID(user.firebaseUID);
        } else {
            /// Also we will check once if there an user already with that email
            /// in-order to make sure we don't call create of firebase user
            /// with an already existing email.
            fbUser = await this.firebaseService.loadUserByEmail(user.email);
            if (fbUser && fbUser.uid) {
                user.firebaseUID = fbUser.uid;
            }
        }

        if (!fbUser || !fbUser.uid) {
            fbUser = await this.firebaseService.createUser(user.email.toLowerCase(), password);
        } else {
            fbUser = await this.firebaseService.updateUserByUID(user.firebaseUID, user.email.toLowerCase(), user.password);
        }
        if (fbUser && fbUser.uid) {
            user.firebaseUID = fbUser.uid;
            await User.save(user);
        }

        await this.checkFirestoreDatabase(user, true);
    }

    protected async checkFirestoreDatabase(user, update = false) {
        if (user.firebaseUID) {
            let db = admin.firestore();
            let usersCollectionRef = await db.collection('users');
            let queryRef = usersCollectionRef.where('uid', '==', user.firebaseUID);
            let querySnapshot = await queryRef.get();
            if (querySnapshot.empty) {
                usersCollectionRef.doc(user.firebaseUID).set({
                    'email': user.email.toLowerCase(),
                    'firstName': user.firstName,
                    'lastName': user.lastName,
                    'uid': user.firebaseUID,
                    'avatar': (user.photoUrl != null && user.photoUrl != undefined) ? user.photoUrl : null,
                    'created_at': admin.firestore.FieldValue.serverTimestamp(),
                    'searchKeywords': [
                        `${user.firstName} ${user.lastName}`,
                        user.firstName,
                        user.lastName,
                        user.email.toLowerCase()
                    ]
                });
            } else if (update) {
                usersCollectionRef.doc(user.firebaseUID).update({
                    'email': user.email.toLowerCase(),
                    'firstName': user.firstName,
                    'lastName': user.lastName,
                    'uid': user.firebaseUID,
                    'avatar': (user.photoUrl != null && user.photoUrl != undefined) ? user.photoUrl : null,
                    'updated_at': admin.firestore.FieldValue.serverTimestamp(),
                    'searchKeywords': [
                        `${user.firstName} ${user.lastName}`,
                        user.firstName,
                        user.lastName,
                        user.email.toLowerCase()
                    ]
                });
            }
        }
    }
}
