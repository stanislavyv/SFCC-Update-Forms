/**
 * Shows/ Hides password on eye icon click
 */
function togglePassword() {
    const $allBtns = $(".js-password-mask");

    $allBtns.each(function () {
        const $currBtn = $(this);

        $currBtn.on("click", function () {
            const $passwordField = $currBtn.siblings(".js-password-field");

            if ($currBtn.hasClass("fa-eye")) {
                $currBtn.removeClass("fa-eye");
                $currBtn.addClass("fa-eye-slash");

                $passwordField.attr("type", "text");
            } else {
                $currBtn.removeClass("fa-eye-slash");
                $currBtn.addClass("fa-eye");

                $passwordField.attr("type", "password");
            }
        });
    });
}

module.exports = {
    togglePassword,
};
