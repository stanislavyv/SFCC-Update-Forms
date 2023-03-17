"use strict";

/**
 * @namespace Account
 */

const server = require("server");

const csrfProtection = require("*/cartridge/scripts/middleware/csrf");
const userLoggedIn = require("*/cartridge/scripts/middleware/userLoggedIn");
const consentTracking = require("*/cartridge/scripts/middleware/consentTracking");

const base = module.superModule;
server.extend(base);

/**
 * Account-SubmitRegistration : The Account-SubmitRegistration endpoint is the endpoint that gets hit when a shopper submits their registration for a new account
 * @name Base/Account-SubmitRegistration
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {querystringparameter} - rurl - redirect url. The value of this is a number. This number then gets mapped to an endpoint set up in oAuthRenentryRedirectEndpoints.js
 * @param {httpparameter} - dwfrm_profile_customer_firstname - Input field for the shoppers's first name
 * @param {httpparameter} - dwfrm_profile_customer_lastname - Input field for the shopper's last name
 * @param {httpparameter} - dwfrm_profile_customer_phone - Input field for the shopper's phone number
 * @param {httpparameter} - dwfrm_profile_customer_email - Input field for the shopper's email address
 * @param {httpparameter} - dwfrm_profile_customer_emailconfirm - Input field for the shopper's email address
 * @param {httpparameter} - dwfrm_profile_login_password - Input field for the shopper's password
 * @param {httpparameter} - dwfrm_profile_login_passwordconfirm: - Input field for the shopper's password to confirm
 * @param {httpparameter} - dwfrm_profile_customer_addtoemaillist - Checkbox for whether or not a shopper wants to be added to the mailing list
 * @param {httpparameter} - csrf_token - hidden input field CSRF token
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.replace(
    "SubmitRegistration",
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        const CustomerMgr = require("dw/customer/CustomerMgr");
        const Resource = require("dw/web/Resource");

        const formErrors = require("*/cartridge/scripts/formErrors");

        // Change to register
        const registrationForm = server.forms.getForm("profile").register;

        // form validation

        if (
            !CustomerMgr.isAcceptablePassword(
                registrationForm.login.password.value
            )
        ) {
            registrationForm.login.password.valid = false;
            registrationForm.login.password.error = Resource.msg(
                "error.message.password.constraints.not.matched",
                "forms",
                null
            );
            registrationForm.valid = false;
        }

        // setting variables for the BeforeComplete function
        const registrationFormObj = {
            email: registrationForm.customer.email.value,
            password: registrationForm.login.password.value,
            validForm: registrationForm.valid,
            form: registrationForm,
        };

        if (registrationForm.valid) {
            res.setViewData(registrationFormObj);

            this.on("route:BeforeComplete", function (req, res) {
                // eslint-disable-line no-shadow
                const Transaction = require("dw/system/Transaction");
                const accountHelpers = require("*/cartridge/scripts/helpers/accountHelpers");
                let authenticatedCustomer;
                let serverError;

                // getting variables for the BeforeComplete function
                const registrationForm = res.getViewData(); // eslint-disable-line

                if (registrationForm.validForm) {
                    const login = registrationForm.email;
                    const password = registrationForm.password;

                    // attempt to create a new user and log that user in.
                    try {
                        Transaction.wrap(function () {
                            let error = {};
                            const newCustomer = CustomerMgr.createCustomer(
                                login,
                                password
                            );

                            const authenticateCustomerResult =
                                CustomerMgr.authenticateCustomer(
                                    login,
                                    password
                                );
                            if (
                                authenticateCustomerResult.status !== "AUTH_OK"
                            ) {
                                error = {
                                    authError: true,
                                    status: authenticateCustomerResult.status,
                                };
                                throw error;
                            }

                            authenticatedCustomer = CustomerMgr.loginCustomer(
                                authenticateCustomerResult,
                                false
                            );

                            if (!authenticatedCustomer) {
                                error = {
                                    authError: true,
                                    status: authenticateCustomerResult.status,
                                };
                                throw error;
                            } else {
                                // assign values to the profile
                                const newCustomerProfile =
                                    newCustomer.getProfile();

                                newCustomerProfile.email =
                                    registrationForm.email;
                            }
                        });
                    } catch (e) {
                        if (e.authError) {
                            serverError = true;
                        } else {
                            registrationForm.validForm = false;
                            registrationForm.form.customer.email.valid = false;
                            registrationForm.form.customer.email.error =
                                Resource.msg(
                                    "error.message.username.invalid",
                                    "forms",
                                    null
                                );
                        }
                    }
                }

                delete registrationForm.password;
                formErrors.removeFormValues(registrationForm.form);

                if (serverError) {
                    res.setStatusCode(500);
                    res.json({
                        success: false,
                        errorMessage: Resource.msg(
                            "error.message.unable.to.create.account",
                            "login",
                            null
                        ),
                    });

                    return;
                }

                if (registrationForm.validForm) {
                    // send a registration email
                    accountHelpers.sendCreateAccountEmail(
                        authenticatedCustomer.profile
                    );

                    res.setViewData({
                        authenticatedCustomer: authenticatedCustomer,
                    });
                    res.json({
                        success: true,
                        redirectUrl: accountHelpers.getLoginRedirectURL(
                            req.querystring.rurl,
                            req.session.privacyCache,
                            true
                        ),
                    });

                    req.session.privacyCache.set("args", null);
                } else {
                    res.json({
                        fields: formErrors.getFormErrors(registrationForm),
                    });
                }
            });
        } else {
            res.json({
                fields: formErrors.getFormErrors(registrationForm),
            });
        }

        return next();
    }
);

/**
 * Account-EditProfile : The Account-EditProfile endpoint renders the page that allows a shopper to edit their profile. The edit profile form is prefilled with the shopper's first name, last name, phone number and email
 * @name Base/Account-EditProfile
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken
 * @param {middleware} - userLoggedIn.validateLoggedIn
 * @param {middleware} - consentTracking.consent
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.replace(
    "EditProfile",
    server.middleware.https,
    csrfProtection.generateToken,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        const ContentMgr = require("dw/content/ContentMgr");
        const Resource = require("dw/web/Resource");
        const URLUtils = require("dw/web/URLUtils");
        const accountHelpers = require("*/cartridge/scripts/account/accountHelpers");

        const accountModel = accountHelpers.getAccountModel(req);
        const content = ContentMgr.getContent("tracking_hint");
        // Change to edit
        const profileForm = server.forms.getForm("profile");

        profileForm.clear();
        profileForm.edit.customer.firstname.value = accountModel.profile.firstName;
        profileForm.edit.customer.lastname.value = accountModel.profile.lastName;
        profileForm.edit.customer.phone.value = accountModel.profile.phone;
        profileForm.edit.customer.email.value = accountModel.profile.email;
        res.render("account/profile", {
            consentApi: Object.prototype.hasOwnProperty.call(
                req.session.raw,
                "setTrackingAllowed"
            ),
            caOnline: content ? content.online : false,
            profileForm: profileForm.edit,
            breadcrumbs: [
                {
                    htmlValue: Resource.msg("global.home", "common", null),
                    url: URLUtils.home().toString(),
                },
                {
                    htmlValue: Resource.msg(
                        "page.title.myaccount",
                        "account",
                        null
                    ),
                    url: URLUtils.url("Account-Show").toString(),
                },
            ],
        });
        next();
    }
);

/**
 * Account-SaveProfile : The Account-SaveProfile endpoint is the endpoint that gets hit when a shopper has edited their profile
 * @name Base/Account-SaveProfile
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {httpparameter} - dwfrm_profile_customer_firstname - Input field for the shoppers's first name
 * @param {httpparameter} - dwfrm_profile_customer_lastname - Input field for the shopper's last name
 * @param {httpparameter} - dwfrm_profile_customer_phone - Input field for the shopper's phone number
 * @param {httpparameter} - dwfrm_profile_customer_email - Input field for the shopper's email address
 * @param {httpparameter} - dwfrm_profile_customer_emailconfirm - Input field for the shopper's email address
 * @param {httpparameter} - dwfrm_profile_login_password  - Input field for the shopper's password
 * @param {httpparameter} - csrf_token - hidden input field CSRF token
 * @param {category} - sensititve
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.replace(
    "SaveProfile",
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        const Transaction = require("dw/system/Transaction");
        const CustomerMgr = require("dw/customer/CustomerMgr");
        const Resource = require("dw/web/Resource");
        const URLUtils = require("dw/web/URLUtils");
        const accountHelpers = require("*/cartridge/scripts/helpers/accountHelpers");

        const formErrors = require("*/cartridge/scripts/formErrors");

        // Add edit
        const profileForm = server.forms.getForm("profile").edit;

        // form validation
        if (
            profileForm.customer.email.value.toLowerCase() !==
            profileForm.customer.emailconfirm.value.toLowerCase()
        ) {
            profileForm.valid = false;
            profileForm.customer.email.valid = false;
            profileForm.customer.emailconfirm.valid = false;
            profileForm.customer.emailconfirm.error = Resource.msg(
                "error.message.mismatch.email",
                "forms",
                null
            );
        }

        var result = {
            firstName: profileForm.customer.firstname.value,
            lastName: profileForm.customer.lastname.value,
            phone: profileForm.customer.phone.value,
            email: profileForm.customer.email.value,
            confirmEmail: profileForm.customer.emailconfirm.value,
            password: profileForm.login.password.value,
            profileForm: profileForm,
        };
        if (profileForm.valid) {
            res.setViewData(result);
            this.on("route:BeforeComplete", function (req, res) {
                // eslint-disable-line no-shadow
                const formInfo = res.getViewData();
                const customer = CustomerMgr.getCustomerByCustomerNumber(
                    req.currentCustomer.profile.customerNo
                );
                const profile = customer.getProfile();
                let customerLogin;
                let status;

                Transaction.wrap(function () {
                    status = profile.credentials.setPassword(
                        formInfo.password,
                        formInfo.password,
                        true
                    );

                    if (status.error) {
                        formInfo.profileForm.login.password.valid = false;
                        formInfo.profileForm.login.password.error =
                            Resource.msg(
                                "error.message.currentpasswordnomatch",
                                "forms",
                                null
                            );
                    } else {
                        customerLogin = profile.credentials.setLogin(
                            formInfo.email,
                            formInfo.password
                        );
                    }
                });

                delete formInfo.password;
                delete formInfo.confirmEmail;

                if (customerLogin) {
                    Transaction.wrap(function () {
                        profile.setFirstName(formInfo.firstName);
                        profile.setLastName(formInfo.lastName);
                        profile.setEmail(formInfo.email);
                        profile.setPhoneHome(formInfo.phone);
                    });

                    // Send account edited email
                    accountHelpers.sendAccountEditedEmail(customer.profile);

                    delete formInfo.profileForm;
                    delete formInfo.email;

                    res.json({
                        success: true,
                        redirectUrl: URLUtils.url("Account-Show").toString(),
                    });
                } else {
                    if (!status.error) {
                        formInfo.profileForm.customer.email.valid = false;
                        formInfo.profileForm.customer.email.error =
                            Resource.msg(
                                "error.message.username.invalid",
                                "forms",
                                null
                            );
                    }

                    delete formInfo.profileForm;
                    delete formInfo.email;

                    res.json({
                        success: false,
                        fields: formErrors.getFormErrors(profileForm),
                    });
                }
            });
        } else {
            res.json({
                success: false,
                fields: formErrors.getFormErrors(profileForm),
            });
        }
        return next();
    }
);

/**
 * Account-EditPassword : The Account-EditPassword endpoint renders thes edit password pages. This page allows the shopper to change their password for their account
 * @name Base/Account-EditPassword
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken
 * @param {middleware} - userLoggedIn.validateLoggedIn
 * @param {middleware} - consentTracking.consent
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.replace(
    'EditPassword',
    server.middleware.https,
    csrfProtection.generateToken,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        const Resource = require('dw/web/Resource');
        const URLUtils = require('dw/web/URLUtils');

        // Add edit
        const profileForm = server.forms.getForm('profile').edit;
        profileForm.clear();
        res.render('account/password', {
            profileForm: profileForm,
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                },
                {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                }
            ]
        });
        next();
    }
);


/**
 * Account-SavePassword : The Account-SavePassword endpoint is the endpoit that handles changing the shopper's password
 * @name Base/Account-SavePassword
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {httpparameter} - dwfrm_profile_login_currentpassword - Input field for the shopper's current password
 * @param {httpparameter} - dwfrm_profile_login_newpasswords_newpassword - Input field for the shopper's new password
 * @param {httpparameter} - dwfrm_profile_login_newpasswords_newpasswordconfirm - Input field for the shopper to confirm their new password
 * @param {httpparameter} - csrf_token - hidden input field CSRF token
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.replace(
    'SavePassword',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        const Transaction = require('dw/system/Transaction');
        const CustomerMgr = require('dw/customer/CustomerMgr');
        const Resource = require('dw/web/Resource');
        const URLUtils = require('dw/web/URLUtils');

        const formErrors = require('*/cartridge/scripts/formErrors');

        // Add edit
        const profileForm = server.forms.getForm('profile').edit;
        const newPasswords = profileForm.login.newpasswords;
        // form validation
        if (newPasswords.newpassword.value !== newPasswords.newpasswordconfirm.value) {
            profileForm.valid = false;
            newPasswords.newpassword.valid = false;
            newPasswords.newpasswordconfirm.valid = false;
            newPasswords.newpasswordconfirm.error =
                Resource.msg('error.message.mismatch.newpassword', 'forms', null);
        }

        const result = {
            currentPassword: profileForm.login.currentpassword.value,
            newPassword: newPasswords.newpassword.value,
            newPasswordConfirm: newPasswords.newpasswordconfirm.value,
            profileForm: profileForm
        };

        if (profileForm.valid) {
            res.setViewData(result);
            this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
                const formInfo = res.getViewData();
                const customer = CustomerMgr.getCustomerByCustomerNumber(
                    req.currentCustomer.profile.customerNo
                );
                let status;
                Transaction.wrap(function () {
                    status = customer.profile.credentials.setPassword(
                        formInfo.newPassword,
                        formInfo.currentPassword,
                        true
                    );
                });
                if (status.error) {
                    if (!CustomerMgr.isAcceptablePassword(newPasswords.newpassword.value)) {
                        formInfo.profileForm.login.newpasswords.newpassword.valid = false;
                        formInfo.profileForm.login.newpasswords.newpassword.error =
                            Resource.msg('error.message.password.constraints.not.matched', 'forms', null);
                    } else {
                        formInfo.profileForm.login.currentpassword.valid = false;
                        formInfo.profileForm.login.currentpassword.error =
                            Resource.msg('error.message.currentpasswordnomatch', 'forms', null);
                    }

                    delete formInfo.currentPassword;
                    delete formInfo.newPassword;
                    delete formInfo.newPasswordConfirm;
                    delete formInfo.profileForm;

                    res.json({
                        success: false,
                        fields: formErrors.getFormErrors(profileForm)
                    });
                } else {
                    delete formInfo.currentPassword;
                    delete formInfo.newPassword;
                    delete formInfo.newPasswordConfirm;
                    delete formInfo.profileForm;

                    res.json({
                        success: true,
                        redirectUrl: URLUtils.url('Account-Show').toString()
                    });
                }
            });
        } else {
            res.json({
                success: false,
                fields: formErrors.getFormErrors(profileForm)
            });
        }
        return next();
    }
);


module.exports = server.exports();
