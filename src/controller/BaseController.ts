import { Inject } from 'typedi';
import admin from 'firebase-admin';

import { isNullOrEmpty } from '../utils/Utils';
import { User } from '../models/User';
import FirebaseService from '../services/FirebaseService';
import UserRoleEntityService from '../services/UserRoleEntityService';
import UserService from '../services/UserService';
import UserDeviceService from '../services/UserDeviceService';
import AffiliateService from '../services/AffiliatesService';
import OrganisationService from '../services/OrganisationService';
import OrganisationLogoService from '../services/OrganisationLogoService';
import CommunicationTemplateService from '../services/CommunicationTemplateService';
import UserDashboardService from '../services/UserDashboardService';
import UserRegistrationService from '../services/UserRegistrationService';
import OrganisationPhotoService from '../services/OrganisationPhotoService';
import OrganisationSettingsService from '../services/OrganisationSettingsService';
import ActionsService from '../services/ActionsService';
import CharityRoundUpService from '../services/CharityRoundUpService';
import CharityService from '../services/CharityService';
import CommunicationTrackService from '../services/CommunicationTrackService';
import CommunicationService from "../services/CommunicationService";
import {TermsAndConditionsService} from "../services/TermsAndConditionsService";

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
    protected organisationSettingsService: OrganisationSettingsService;

    @Inject()
    protected userDashboardService: UserDashboardService;

    @Inject()
    protected charityRoundUpService: CharityRoundUpService;

    @Inject()
    protected charityService: CharityService;

    @Inject()
    protected communicationTrackService: CommunicationTrackService;

    @Inject()
    protected termsAndConditionsService: TermsAndConditionsService;

    @Inject()
    protected communicationService: CommunicationService;

    protected async updateFirebaseData(user: User, password: string) {
        user.password = password;

        let fbUser;
        /// If there an existing firebaseUID get the firebase user via that
        if (!isNullOrEmpty(user.firebaseUID)) {
            fbUser = await this.firebaseService.loadUserByUID(user.firebaseUID);
        } else {
            /// Also we will check once if there an user alreay with that email
            /// in-order to make sure we don't call create of firebase user
            /// with an already existing email.
            fbUser = await this.firebaseService.loadUserByEmail(user.email);
            if (fbUser && fbUser.uid) {
                user.firebaseUID = fbUser.uid;
            }
        }

        if (!fbUser || !fbUser.uid) {
            fbUser = await this.firebaseService.createUser(
                user.email.toLowerCase(),
                password
            );
        } else {
            if (user && isNullOrEmpty(user.firebaseUID)) {
                fbUser = await this.firebaseService.createUser(
                    user.email.toLowerCase(),
                    password
                );
            } else if (user) {
                fbUser = await this.firebaseService.updateUserByUID(
                    user.firebaseUID,
                    user.email.toLowerCase(),
                    user.password
                );
            }
        }

        if (fbUser && fbUser.uid) {
            user.firebaseUID = fbUser.uid;
            await User.save(user);
        }

        await this.checkFirestoreDatabase(user, true);
    }

    protected async checkFirestoreDatabase(user, update = false) {
        if (!isNullOrEmpty(user.firebaseUID)) {
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
