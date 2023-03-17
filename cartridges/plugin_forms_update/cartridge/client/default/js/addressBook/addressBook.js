"use strict";

const base = require('base/addressBook/addressBook');;

/**
 * Submits address form
 */
 function submitAddress() {
    const formValidation = require("base/components/formValidation");
    const $allAddressForms = $(".js-address-form");

    $allAddressForms.each(function (i, currForm) {
        const $currForm = $(currForm);

        $currForm.on("submit", function (e) {
            const addressType = $currForm.find(".js-address-type").val();
            e.preventDefault();

            const url = $currForm.attr("action");

            $currForm.spinner().start();
            $currForm.trigger("address:submit", e);
            //append addressType to request url
            $.ajax({
                url: `${url}?addressType=${addressType}`,
                type: "post",
                dataType: "json",
                data: $currForm.serialize(),
                success: function (data) {
                    $currForm.spinner().stop();
                    if (!data.success) {
                        formValidation($currForm, data);
                    } else {
                        location.href = data.redirectUrl;
                    }
                },
                error: function () {
                    if (err.responseJSON.redirectUrl) {
                        window.location.href = err.responseJSON.redirectUrl;
                    }
                    $currForm.spinner().stop();
                },
            });

            return false;
        });
    });
};

base.submitAddress = submitAddress;

module.exports = base;
