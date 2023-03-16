"use strict";

const base = require('base/addressBook/addressBook');;

/**
 * Allows functionality to select from different address type forms
 */
function changeFormType() {
    const $radioBtns = $('.js-address-type input[name="addressType"]');

    $radioBtns.on("change", function () {
        const $currBtn = $radioBtns.filter(":checked");

        const formSelector = `.js-${$currBtn.val()}-address-form`;
        const $newActiveForm = $(formSelector);

        $newActiveForm.removeClass("d-none");
        $newActiveForm.siblings('[class$="address-form"]').addClass("d-none");
    });
};

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

base.changeFormType = changeFormType;
base.submitAddress = submitAddress;

module.exports = base;
