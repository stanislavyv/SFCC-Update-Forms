const base = module.superModule;

const BasketMgr = require("dw/order/BasketMgr");
const Transaction = require("dw/system/Transaction");

/**
 * Copies a CustomerAddress to a Shipment as its Shipping Address
 * @param {dw.customer.CustomerAddress} address - The customer address
 * @param {dw.order.Shipment} [shipmentOrNull] - The target shipment
 */
base.copyCustomerAddressToShipment = function (address, shipmentOrNull) {
    const currentBasket = BasketMgr.getCurrentBasket();
    const shipment = shipmentOrNull || currentBasket.defaultShipment;
    const shippingAddress = shipment.shippingAddress;

    Transaction.wrap(function () {
        if (shippingAddress === null) {
            shippingAddress = shipment.createShippingAddress();
        }

        shippingAddress.setFirstName(address.firstName);
        shippingAddress.setLastName(address.lastName);
        shippingAddress.setAddress1(address.address1);
        shippingAddress.setAddress2(address.address2);
        shippingAddress.setCity(address.city);
        shippingAddress.setPostalCode(address.postalCode);
        shippingAddress.setStateCode(address.stateCode);
        const countryCode = address.countryCode;
        shippingAddress.setCountryCode(countryCode.value);
        shippingAddress.setPhone(address.phone);

        if (address.companyName && address.vat) {
            shippingAddress.setCompanyName(address.companyName);
            shippingAddress.custom.vat = address.vat;
        }
    });
};

/**
 * Copies a CustomerAddress to a Basket as its Billing Address
 * @param {dw.customer.CustomerAddress} address - The customer address
 */
base.copyCustomerAddressToBilling = function(address) {
    const currentBasket = BasketMgr.getCurrentBasket();
    let billingAddress = currentBasket.billingAddress;

    Transaction.wrap(function () {
        if (!billingAddress) {
            billingAddress = currentBasket.createBillingAddress();
        }

        billingAddress.setFirstName(address.firstName);
        billingAddress.setLastName(address.lastName);
        billingAddress.setAddress1(address.address1);
        billingAddress.setAddress2(address.address2);
        billingAddress.setCity(address.city);
        billingAddress.setPostalCode(address.postalCode);
        billingAddress.setStateCode(address.stateCode);
        const countryCode = address.countryCode;
        billingAddress.setCountryCode(countryCode.value);

        if (!billingAddress.phone) {
            billingAddress.setPhone(address.phone);
        }

        if (address.companyName && address.vat) {
            billingAddress.setCompanyName(address.companyName);
            billingAddress.custom.vat = address.vat;
        }
    });
}


/**
 * Copies information from the shipping form to the associated shipping address
 * @param {Object} shippingData - the shipping data
 * @param {dw.order.Shipment} [shipmentOrNull] - the target Shipment
 */
base.copyShippingAddressToShipment = function (shippingData, shipmentOrNull) {
    const ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
    
    const currentBasket = BasketMgr.getCurrentBasket();
    const shipment = shipmentOrNull || currentBasket.defaultShipment;

    const shippingAddress = shipment.shippingAddress;

    Transaction.wrap(function () {
        if (shippingAddress === null) {
            shippingAddress = shipment.createShippingAddress();
        }

        shippingAddress.setFirstName(shippingData.address.firstName);
        shippingAddress.setLastName(shippingData.address.lastName);
        shippingAddress.setAddress1(shippingData.address.address1);
        shippingAddress.setAddress2(shippingData.address.address2);
        shippingAddress.setCity(shippingData.address.city);
        shippingAddress.setPostalCode(shippingData.address.postalCode);
        shippingAddress.setStateCode(shippingData.address.stateCode);
        const countryCode = shippingData.address.countryCode.value
            ? shippingData.address.countryCode.value
            : shippingData.address.countryCode;
        shippingAddress.setCountryCode(countryCode);
        shippingAddress.setPhone(shippingData.address.phone);

        if (shippingData.address.companyName) {
            shippingAddress.setCompanyName(shippingData.address.companyName);
            shippingAddress.custom.vat = shippingData.address.vat;
        }

        ShippingHelper.selectShippingMethod(
            shipment,
            shippingData.shippingMethod
        );
    });
};

/**
 * Validate billing form
 * @param {Object} form - the form object with pre-validated form fields
 * @returns {Object} the names of the invalid form fields
 */
function validateFields(form) {
    const formErrors = require('*/cartridge/scripts/formErrors');
    return formErrors.getFormErrors(form);
}

base.validateFields = validateFields;

/**
 * Validate credit card form fields
 * @param {Object} form - the form object with pre-validated form fields
 * @returns {Object} the names of the invalid form fields
 */
base.validateCreditCard = function(form) {
    const result = {};
    const currentBasket = BasketMgr.getCurrentBasket();

    if (!form.paymentMethod.value) {
        if (currentBasket.totalGrossPrice.value > 0) {
            result[form.paymentMethod.htmlName] =
                Resource.msg('error.no.selected.payment.method', 'creditCard', null);
        }

        return result;
    }

    const fieldsToValidate = form.creditCardFields || form;

    return validateFields(fieldsToValidate);
}

module.exports = base;
