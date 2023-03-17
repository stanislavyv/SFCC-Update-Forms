const server = require("server");
const csrfProtection = require("*/cartridge/scripts/middleware/csrf");
const addressTypeValidation = require("~/cartridge/scripts/middleware/addressType");

const base = module.superModule;
server.extend(base);

/**
 * @namespace Address
 */

/**
 * Address-SaveAddress : Save a new or existing address
 * @name Base/Address-SaveAddress
 * @function
 * @memberof Address
 * @param {middleware} - csrfProtection.validateAjaxRequest
 * @param {middleware} - addressTypeValidation.validateType
 * @param {querystringparameter} - addressId - a string used to identify the address record
 * @param {httpparameter} - dwfrm_address_addressId - An existing address id (unless new record)
 * @param {httpparameter} - dwfrm_address_firstName - A person’s first name
 * @param {httpparameter} - dwfrm_address_lastName - A person’s last name
 * @param {httpparameter} - dwfrm_address_address1 - A person’s street name
 * @param {httpparameter} - dwfrm_address_address2 -  A person’s apartment number
 * @param {httpparameter} - dwfrm_address_country - A person’s country
 * @param {httpparameter} - dwfrm_address_states_stateCode - A person’s state
 * @param {httpparameter} - dwfrm_address_city - A person’s city
 * @param {httpparameter} - dwfrm_address_postalCode - A person’s united states postel code
 * @param {httpparameter} - dwfrm_address_phone - A person’s phone number
 * @param {httpparameter} - csrf_token - hidden input field CSRF token
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.replace(
    "SaveAddress",
    csrfProtection.validateAjaxRequest,
    addressTypeValidation.validateType,
    function (req, res, next) {
        const CustomerMgr = require("dw/customer/CustomerMgr");
        const Transaction = require("dw/system/Transaction");
        const URLUtils = require("dw/web/URLUtils");
        const formErrors = require("*/cartridge/scripts/formErrors");
        const accountHelpers = require("*/cartridge/scripts/helpers/accountHelpers");
        const addressHelpers = require("*/cartridge/scripts/helpers/addressHelpers");

        const baseForm = server.forms.getForm("address");
        const baseFormObj = baseForm.toObject();
        baseFormObj.addressForm = baseForm;

        const addressType = res.getViewData().addressType;
        const addressForm = baseForm[addressType];

        const customer = CustomerMgr.getCustomerByCustomerNumber(
            req.currentCustomer.profile.customerNo
        );
        const addressBook = customer.getProfile().getAddressBook();
        if (addressForm.valid) {
            res.setViewData(baseFormObj);
            this.on("route:BeforeComplete", function () {
                // eslint-disable-line no-shadow
                const formInfo = res.getViewData()[addressType];
                Transaction.wrap(function () {
                    let address = null;
                    if (
                        formInfo.addressId.equals(req.querystring.addressId) ||
                        !addressBook.getAddress(formInfo.addressId)
                    ) {
                        address = req.querystring.addressId
                            ? addressBook.getAddress(req.querystring.addressId)
                            : addressBook.createAddress(formInfo.addressId);
                    }

                    if (address) {
                        if (req.querystring.addressId) {
                            address.setID(formInfo.addressId);
                        }

                        // Save form's address
                        addressHelpers.updateAddressFields(address, formInfo);

                        // Send account edited email
                        accountHelpers.sendAccountEditedEmail(customer.profile);

                        res.json({
                            success: true,
                            redirectUrl:
                                URLUtils.url("Address-List").toString(),
                        });
                    } else {
                        formInfo.addressForm.valid = false;
                        formInfo.addressForm.addressId.valid = false;
                        formInfo.addressForm.addressId.error = Resource.msg(
                            "error.message.idalreadyexists",
                            "forms",
                            null
                        );
                        res.json({
                            success: false,
                            fields: formErrors.getFormErrors(addressForm),
                        });
                    }
                });
            });
        } else {
            res.json({
                success: false,
                fields: formErrors.getFormErrors(addressForm),
            });
        }
        return next();
    }
);

module.exports = server.exports();
