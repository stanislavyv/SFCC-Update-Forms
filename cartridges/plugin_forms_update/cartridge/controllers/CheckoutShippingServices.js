'use strict';

/**
 * @namespace CheckoutShippingServices
 */

const server = require('server');
const csrfProtection = require('*/cartridge/scripts/middleware/csrf');

const base = module.superModule;
server.extend(base);

/**
 * Handle Ajax shipping form submit
 */
/**
 * CheckoutShippingServices-SubmitShipping : The CheckoutShippingServices-SubmitShipping endpoint submits the shopper's shipping addresse(s) and shipping method(s) and saves them to the basket
 * @name Base/CheckoutShippingServices-SubmitShipping
 * @function
 * @memberof CheckoutShippingServices
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {middleware} - addressTypeValidation.validateType
 * @param {httpparameter} - shipmentUUID - The universally unique identifier of the shipment
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_shippingMethodID - The selected shipping method id
 * @param {httpparameter} - shipmentSelector - For Guest shopper: A shipment UUID that contains address that matches the selected address, For returning shopper: ab_<address-name-from-address-book>" of the selected address. For both type of shoppers: "new" if a brand new address is entered
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_addressFields_firstName - shipping address input field, shopper's shipping first name
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_addressFields_lastName - shipping address input field, shopper's last name
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_addressFields_address1 - shipping address input field, address line 1
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_addressFields_address2 - shipping address nput field address line 2
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_addressFields_country - shipping address input field, country
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_addressFields_states_stateCode - shipping address input field, state code (Not all locales have state code)
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_addressFields_city - shipping address input field, city
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_addressFields_postalCode - shipping address input field, postal code (or zipcode)
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_addressFields_phone - shipping address input field, shopper's phone number
 * @param {httpparameter} - dwfrm_shipping_shippingAddress_giftMessage - text area for gift message
 * @param {httpparameter} - csrf_token - Hidden input field CSRF token
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.replace(
    'SubmitShipping',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        const BasketMgr = require('dw/order/BasketMgr');
        const URLUtils = require('dw/web/URLUtils');
        const COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        const validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');

        const currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket) {
            res.json({
                error: true,
                cartError: true,
                fieldErrors: [],
                serverErrors: [],
                redirectUrl: URLUtils.url('Cart-Show').toString()
            });
            return next();
        }

        const validatedProducts = validationHelpers.validateProducts(currentBasket);
        if (validatedProducts.error) {
            res.json({
                error: true,
                cartError: true,
                fieldErrors: [],
                serverErrors: [],
                redirectUrl: URLUtils.url('Cart-Show').toString()
            });
            return next();
        }

        // add addressType
        const form = server.forms.getForm('shipping');

        const addressFields = form.shippingAddress.addressFields;
        const result = {};

        // verify shipping form data
        const shippingFormErrors = COHelpers.validateShippingForm(addressFields);

        if (Object.keys(shippingFormErrors).length > 0) {
            req.session.privacyCache.set(currentBasket.defaultShipment.UUID, 'invalid');

            res.json({
                form: form,
                fieldErrors: [shippingFormErrors],
                serverErrors: [],
                error: true
            });
        } else {
            req.session.privacyCache.set(currentBasket.defaultShipment.UUID, 'valid');

            result.address = {
                firstName: addressFields.firstName.value,
                lastName: addressFields.lastName.value,
                address1: addressFields.address1.value,
                address2: addressFields.address2.value,
                city: addressFields.city.value,
                postalCode: addressFields.postalCode.value,
                countryCode: addressFields.country.value,
                phone: addressFields.phone.value
            };
            if (Object.prototype.hasOwnProperty
                .call(addressFields, 'states')) {
                result.address.stateCode =
                addressFields.states.stateCode.value;
            }
            if (Object.prototype.hasOwnProperty.call(addressFields, 'companyName')) {
                result.address.companyName = addressFields.companyName.value;
                result.address.vat = addressFields.vat.value;
            }

            result.shippingBillingSame =
                form.shippingAddress.shippingAddressUseAsBillingAddress.value;

            result.shippingMethod = form.shippingAddress.shippingMethodID.value
                ? form.shippingAddress.shippingMethodID.value.toString()
                : null;

            result.isGift = form.shippingAddress.isGift.checked;

            result.giftMessage = result.isGift ? form.shippingAddress.giftMessage.value : null;

            res.setViewData(result);

            this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
                const AccountModel = require('*/cartridge/models/account');
                const OrderModel = require('*/cartridge/models/order');
                const Locale = require('dw/util/Locale');

                const shippingData = res.getViewData();

                COHelpers.copyShippingAddressToShipment(
                    shippingData,
                    currentBasket.defaultShipment
                );

                const giftResult = COHelpers.setGift(
                    currentBasket.defaultShipment,
                    shippingData.isGift,
                    shippingData.giftMessage
                );

                if (giftResult.error) {
                    res.json({
                        error: giftResult.error,
                        fieldErrors: [],
                        serverErrors: [giftResult.errorMessage]
                    });
                    return;
                }

                if (!currentBasket.billingAddress) {
                    if (req.currentCustomer.addressBook
                        && req.currentCustomer.addressBook.preferredAddress) {
                        // Copy over preferredAddress (use addressUUID for matching)
                        COHelpers.copyBillingAddressToBasket(
                            req.currentCustomer.addressBook.preferredAddress, currentBasket);
                    } else {
                        // Copy over first shipping address (use shipmentUUID for matching)
                        COHelpers.copyBillingAddressToBasket(
                            currentBasket.defaultShipment.shippingAddress, currentBasket);
                    }
                }
                const usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');
                if (usingMultiShipping === true && currentBasket.shipments.length < 2) {
                    req.session.privacyCache.set('usingMultiShipping', false);
                    usingMultiShipping = false;
                }

                COHelpers.recalculateBasket(currentBasket);

                const currentLocale = Locale.getLocale(req.locale.id);
                const basketModel = new OrderModel(
                    currentBasket,
                    {
                        usingMultiShipping: usingMultiShipping,
                        shippable: true,
                        countryCode: currentLocale.country,
                        containerView: 'basket'
                    }
                );

                res.json({
                    customer: new AccountModel(req.currentCustomer),
                    order: basketModel,
                    form: server.forms.getForm('shipping')
                });
            });
        }

        return next();
    }
);


module.exports = server.exports();
