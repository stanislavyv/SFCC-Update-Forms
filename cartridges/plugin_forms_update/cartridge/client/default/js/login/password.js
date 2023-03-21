/**
 * Shows/ Hides password on eye icon click
 */
function togglePassword() {
    const faEyeIcon = "fa-eye";
    const faEyeSlashIcon = "fa-eye-slash";
    
    const $allBtns = $(".js-password-mask");

    $allBtns.each(function () {
        const $currBtn = $(this);

        $currBtn.on("click", function () {
            const $passwordField = $currBtn.siblings(".js-password-field");

            if ($currBtn.hasClass(faEyeIcon)) {
                $currBtn.removeClass(faEyeIcon);
                $currBtn.addClass(faEyeSlashIcon);

                $passwordField.attr("type", "text");
            } else {
                $currBtn.removeClass(faEyeSlashIcon);
                $currBtn.addClass(faEyeIcon);

                $passwordField.attr("type", "password");
            }
        });
    });
}

module.exports = {
    togglePassword,
};
