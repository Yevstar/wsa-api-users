import { Authorized, Body, Delete, Get, HeaderParam, JsonController, Param, Post, QueryParam, Res } from 'routing-controllers';
import { BaseController } from "./BaseController";
import Stripe from 'stripe';
import { User } from '../models/User';
import { Organisation } from '../models/Organisation';


@JsonController('/becs')
export class BecsController extends BaseController {
    private stripe;
    constructor() {
        super()
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2020-08-27' });
    }

    @Authorized()
    @Get('/secret/:orgId')
    async getSecret(
        @HeaderParam("authorization") currentUser: User,
        @Param("orgId") orgId: number
    ): Promise<unknown> {
        let orgProfile: Organisation = await this.organisationService.findById(orgId);
        let stripeCustomerId;
        // Removed check because we need to add more payment methods to replace old one
        // if (orgProfile.stripeBecsMandateId) {
        //     throw new Error('Already attached BECS account')
        // }
        if (!orgProfile.stripeCustomerAccountId) {
            const customer = await this.stripe.customers.create({
                name: orgProfile.name,
                email: orgProfile.email,
            })
            await this.organisationService.addStripeCustomerId(orgId, customer.id)
            stripeCustomerId = customer.id
        } else {
            stripeCustomerId = orgProfile.stripeCustomerAccountId
        }
        const setupIntent = await this.stripe.setupIntents.create({
            customer: stripeCustomerId,
            payment_method_types: ["au_becs_debit"],
        });
        return setupIntent.client_secret;
    }

    @Authorized()
    @Get('/confirm/:orgId')
    async confirmBecsSetup(
        @HeaderParam("authorization") currentUser: User,
        @Param("orgId") orgId: number
    ): Promise<unknown> {
        let orgProfile: Organisation = await this.organisationService.findById(orgId);
        let stripeCustomerId;
        if (!orgProfile.stripeCustomerAccountId) {
            throw new Error('Stripe account not found')
        } else {
            stripeCustomerId = orgProfile.stripeCustomerAccountId;
        }
        const paymentMethods = await this.stripe.paymentMethods.list({
            customer: stripeCustomerId,
            type: 'au_becs_debit'
        });

        if (paymentMethods.data && paymentMethods.data.length) {
            await this.organisationService.addBecsId(orgId, paymentMethods.data[0].id)
            if (paymentMethods.data.length > 1) {
                // Make recent added BECS method a default method for customer if there are more than 1 method
                const customer = await this.stripe.customers.update(
                    stripeCustomerId, {
                    invoice_settings: {
                        default_payment_method: paymentMethods.data[0].id
                    }
                }
                );
            }
        } else {
            throw new Error('No BECS account found')
        }
        return 'Account confirmed successfully'
    }
}
