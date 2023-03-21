"use strict";

/**
 * @namespace CheckoutServices
 */

const server = require("server");
const csrfProtection = require("*/cartridge/scripts/middleware/csrf");

const base = module.superModule;
server.extend(base);

/**
 *  Handle Ajax payment (and billing) form submit
 */
/**
 * CheckoutServices-SubmitPayment : The CheckoutServices-SubmitPayment endpoint will submit the payment information and render the checkout place order page allowing the shopper to confirm and place the order
 * @name Base/CheckoutServices-SubmitPayment
 * @function
 * @memberof CheckoutServices
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {middleware} - addressTypeValidation.validateType
 * @param {httpparameter} - addressSelector - For Guest shopper: A shipment UUID that contains address that matches the selected address. For returning shopper: ab_<address-name-from-address-book>" of the selected address. For both type of shoppers:  "new" if a brand new address is entered
 * @param {httpparameter} - dwfrm_billing_addressFields_firstName - Input field for the shoppers's first name
 * @param {httpparameter} - dwfrm_billing_addressFields_lastName - Input field for the shoppers's last name
 * @param {httpparameter} - dwfrm_billing_addressFields_address1 - Input field for the shoppers's address 1 - street
 * @param {httpparameter} - dwfrm_billing_addressFields_address2 - Input field for the shoppers's address 2 - street
 * @param {httpparameter} - dwfrm_billing_addressFields_country - Input field for the shoppers's address - country
 * @param {httpparameter} - dwfrm_billing_addressFields_states_stateCode - Input field for the shoppers's address - state code
 * @param {httpparameter} - dwfrm_billing_addressFields_city - Input field for the shoppers's address - city
 * @param {httpparameter} - dwfrm_billing_addressFields_postalCode - Input field for the shoppers's address - postal code
 * @param {httpparameter} - csrf_token - hidden input field CSRF token
 * @param {httpparameter} - localizedNewAddressTitle - label for new address
 * @param {httpparameter} - dwfrm_billing_contactInfoFields_email - Input field for the shopper's email address
 * @param {httpparameter} - dwfrm_billing_contactInfoFields_phone - Input field for the shopper's phone number
 * @param {httpparameter} - dwfrm_billing_paymentMethod - Input field for the shopper's payment method
 * @param {httpparameter} - dwfrm_billing_creditCardFields_cardType - Input field for the shopper's credit card type
 * @param {httpparameter} - dwfrm_billing_creditCardFields_cardNumber - Input field for the shopper's credit card number
 * @param {httpparameter} - dwfrm_billing_creditCardFields_expirationMonth - Input field for the shopper's credit card expiration month
 * @param {httpparameter} - dwfrm_billing_creditCardFields_expirationYear - Input field for the shopper's credit card expiration year
 * @param {httpparameter} - dwfrm_billing_creditCardFields_securityCode - Input field for the shopper's credit card security code
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.replace(
    "SubmitPayment",
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        const PaymentManager = require("dw/order/PaymentMgr");
        const HookManager = require("dw/system/HookMgr");
        const Resource = require("dw/web/Resource");
        const COHelpers = require("*/cartridge/scripts/checkout/checkoutHelpers");

        const viewData = {};
        const paymentForm = server.forms.getForm("billing");

        const addressFields = paymentForm.addressFields;

        // verify billing form data
        const billingFormErrors = COHelpers.validateBillingForm(addressFields);
        const contactInfoFormErrors = COHelpers.validateFields(
            paymentForm.contactInfoFields
        );

        var formFieldErrors = [];
        if (Object.keys(billingFormErrors).length) {
            formFieldErrors.push(billingFormErrors);
        } else {
            viewData.address = {
                firstName: { value: addressFields.firstName.value },
                lastName: { value: addressFields.lastName.value },
                address1: { value: addressFields.address1.value },
                address2: { value: addressFields.address2.value },
                city: { value: addressFields.city.value },
                postalCode: {
                    value: addressFields.postalCode.value,
                },
                countryCode: { value: addressFields.country.value },
            };

            if (Object.prototype.hasOwnProperty.call(addressFields, "states")) {
                viewData.address.stateCode = {
                    value: addressFields.states.stateCode.value,
                };
            }

            if (
                Object.prototype.hasOwnProperty.call(
                    addressFields,
                    "companyName"
                )
            ) {
                viewData.address.companyName = {
                    value: addressFields.companyName.value,
                };
                viewData.address.vat = {
                    value: addressFields.vat.value,
                };
            }
        }

        if (Object.keys(contactInfoFormErrors).length) {
            formFieldErrors.push(contactInfoFormErrors);
        } else {
            viewData.phone = {
                value: paymentForm.contactInfoFields.phone.value,
            };
        }

        const paymentMethodIdValue = paymentForm.paymentMethod.value;
        if (
            !PaymentManager.getPaymentMethod(paymentMethodIdValue)
                .paymentProcessor
        ) {
            throw new Error(
                Resource.msg(
                    "error.payment.processor.missing",
                    "checkout",
                    null
                )
            );
        }

        const paymentProcessor =
            PaymentManager.getPaymentMethod(
                paymentMethodIdValue
            ).getPaymentProcessor();

        let paymentFormResult;
        if (
            HookManager.hasHook(
                "app.payment.form.processor." +
                    paymentProcessor.ID.toLowerCase()
            )
        ) {
            paymentFormResult = HookManager.callHook(
                "app.payment.form.processor." +
                    paymentProcessor.ID.toLowerCase(),
                "processForm",
                req,
                paymentForm,
                viewData
            );
        } else {
            paymentFormResult = HookManager.callHook(
                "app.payment.form.processor.default_form_processor",
                "processForm"
            );
        }

        if (paymentFormResult.error && paymentFormResult.fieldErrors) {
            formFieldErrors.push(paymentFormResult.fieldErrors);
        }

        if (formFieldErrors.length || paymentFormResult.serverErrors) {
            // respond with form data and errors
            res.json({
                form: paymentForm,
                fieldErrors: formFieldErrors,
                serverErrors: paymentFormResult.serverErrors
                    ? paymentFormResult.serverErrors
                    : [],
                error: true,
            });
            return next();
        }

        res.setViewData(paymentFormResult.viewData);

        this.on("route:BeforeComplete", function (req, res) {
            // eslint-disable-line no-shadow
            const BasketMgr = require("dw/order/BasketMgr");
            const HookMgr = require("dw/system/HookMgr");
            const PaymentMgr = require("dw/order/PaymentMgr");
            const Transaction = require("dw/system/Transaction");
            const AccountModel = require("*/cartridge/models/account");
            const OrderModel = require("*/cartridge/models/order");
            const URLUtils = require("dw/web/URLUtils");
            const Locale = require("dw/util/Locale");
            const basketCalculationHelpers = require("*/cartridge/scripts/helpers/basketCalculationHelpers");
            const hooksHelper = require("*/cartridge/scripts/helpers/hooks");
            const validationHelpers = require("*/cartridge/scripts/helpers/basketValidationHelpers");

            const currentBasket = BasketMgr.getCurrentBasket();

            const billingData = res.getViewData();

            if (!currentBasket) {
                delete billingData.paymentInformation;

                res.json({
                    error: true,
                    cartError: true,
                    fieldErrors: [],
                    serverErrors: [],
                    redirectUrl: URLUtils.url("Cart-Show").toString(),
                });
                return;
            }

            const validatedProducts =
                validationHelpers.validateProducts(currentBasket);
            if (validatedProducts.error) {
                delete billingData.paymentInformation;

                res.json({
                    error: true,
                    cartError: true,
                    fieldErrors: [],
                    serverErrors: [],
                    redirectUrl: URLUtils.url("Cart-Show").toString(),
                });
                return;
            }

            const billingAddress = currentBasket.billingAddress;
            const billingForm = server.forms.getForm("billing");
            const paymentMethodID = billingData.paymentMethod.value;
            let result;

            billingForm.creditCardFields.cardNumber.htmlValue = "";
            billingForm.creditCardFields.securityCode.htmlValue = "";

            Transaction.wrap(function () {
                if (!billingAddress) {
                    billingAddress = currentBasket.createBillingAddress();
                }

                billingAddress.setFirstName(
                    billingData.address.firstName.value
                );
                billingAddress.setLastName(billingData.address.lastName.value);
                billingAddress.setAddress1(billingData.address.address1.value);
                billingAddress.setAddress2(billingData.address.address2.value);
                billingAddress.setCity(billingData.address.city.value);
                billingAddress.setPostalCode(
                    billingData.address.postalCode.value
                );

                if (
                    Object.prototype.hasOwnProperty.call(
                        billingData.address,
                        "stateCode"
                    )
                ) {
                    billingAddress.setStateCode(
                        billingData.address.stateCode.value
                    );
                }
                
                if (
                    Object.prototype.hasOwnProperty.call(
                        billingData.address,
                        "companyName"
                    )
                ) {
                    billingAddress.setCompanyName(
                        billingData.address.companyName.value
                    );
                }
                
                if (
                    Object.prototype.hasOwnProperty.call(
                        billingData.address,
                        "vat"
                    )
                ) {
                    billingAddress.custom.vat = billingData.address.vat.value;
                }

                billingAddress.setCountryCode(
                    billingData.address.countryCode.value
                );
                billingAddress.setPhone(billingData.phone.value);
            });

            // if there is no selected payment option and balance is greater than zero
            if (!paymentMethodID && currentBasket.totalGrossPrice.value > 0) {
                var noPaymentMethod = {};

                noPaymentMethod[billingData.paymentMethod.htmlName] =
                    Resource.msg(
                        "error.no.selected.payment.method",
                        "payment",
                        null
                    );

                delete billingData.paymentInformation;

                res.json({
                    form: billingForm,
                    fieldErrors: [noPaymentMethod],
                    serverErrors: [],
                    error: true,
                });
                return;
            }

            var processor =
                PaymentMgr.getPaymentMethod(
                    paymentMethodID
                ).getPaymentProcessor();

            // check to make sure there is a payment processor
            if (!processor) {
                throw new Error(
                    Resource.msg(
                        "error.payment.processor.missing",
                        "checkout",
                        null
                    )
                );
            }

            if (
                HookMgr.hasHook(
                    "app.payment.processor." + processor.ID.toLowerCase()
                )
            ) {
                result = HookMgr.callHook(
                    "app.payment.processor." + processor.ID.toLowerCase(),
                    "Handle",
                    currentBasket,
                    billingData.paymentInformation,
                    paymentMethodID,
                    req
                );
            } else {
                result = HookMgr.callHook(
                    "app.payment.processor.default",
                    "Handle"
                );
            }

            // need to invalidate credit card fields
            if (result.error) {
                delete billingData.paymentInformation;

                res.json({
                    form: billingForm,
                    fieldErrors: result.fieldErrors,
                    serverErrors: result.serverErrors,
                    error: true,
                });
                return;
            }

            if (
                HookMgr.hasHook(
                    "app.payment.form.processor." + processor.ID.toLowerCase()
                )
            ) {
                HookMgr.callHook(
                    "app.payment.form.processor." + processor.ID.toLowerCase(),
                    "savePaymentInformation",
                    req,
                    currentBasket,
                    billingData
                );
            } else {
                HookMgr.callHook(
                    "app.payment.form.processor.default",
                    "savePaymentInformation"
                );
            }

            // Calculate the basket
            Transaction.wrap(function () {
                basketCalculationHelpers.calculateTotals(currentBasket);
            });

            // Re-calculate the payments.
            var calculatedPaymentTransaction =
                COHelpers.calculatePaymentTransaction(currentBasket);

            if (calculatedPaymentTransaction.error) {
                res.json({
                    form: paymentForm,
                    fieldErrors: [],
                    serverErrors: [
                        Resource.msg("error.technical", "checkout", null),
                    ],
                    error: true,
                });
                return;
            }

            const usingMultiShipping =
                req.session.privacyCache.get("usingMultiShipping");
            if (
                usingMultiShipping === true &&
                currentBasket.shipments.length < 2
            ) {
                req.session.privacyCache.set("usingMultiShipping", false);
                usingMultiShipping = false;
            }

            hooksHelper(
                "app.customer.subscription",
                "subscribeTo",
                [paymentForm.subscribe.checked, currentBasket.customerEmail],
                function () {}
            );

            const currentLocale = Locale.getLocale(req.locale.id);

            const basketModel = new OrderModel(currentBasket, {
                usingMultiShipping: usingMultiShipping,
                countryCode: currentLocale.country,
                containerView: "basket",
            });

            const accountModel = new AccountModel(req.currentCustomer);
            const renderedStoredPaymentInstrument =
                COHelpers.getRenderedPaymentInstruments(req, accountModel);

            delete billingData.paymentInformation;

            res.json({
                renderedPaymentInstruments: renderedStoredPaymentInstrument,
                customer: accountModel,
                order: basketModel,
                form: billingForm,
                error: false,
            });
        });

        return next();
    }
);

module.exports = server.exports();
