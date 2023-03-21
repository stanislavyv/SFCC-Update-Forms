const createErrorNotification = require("base/components/errorNotification");

/**
 * Validates reCaptcha token on registration submit
 * @param {String} token
 */
function verifyReCaptcha(token) {
    const $form = $("form.js-registration");
    const $submitBtn = $form.find(".js-registration-submit");

    const verifyUrl = $submitBtn.data("verify-url");
    $form.spinner().start();
    $.ajax({
        url: verifyUrl,
        type: "post",
        dataType: "json",
        data: { token },
        success: function (data) {
            $form.spinner().stop();

            if (!data.success) {
                createErrorNotification(
                    $(".error-messaging"),
                    data.errorMessage
                );
            } else {
                $form.trigger("submit");
            }
        },
        error: function (err) {
            $form.spinner().stop();
            createErrorNotification(
                $(".error-messaging"),
                err.responseJSON.errorMessage
            );
        },
    });
}

/**
 * Makes reCaptcha sumbission function global so reCaptcha API can use it as callback
 */
function attachToWindow() {
    window.verifyReCaptcha = verifyReCaptcha;
}

module.exports = {
    attachToWindow,
};
