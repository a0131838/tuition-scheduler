# Renewal payment guidance in Package Billing

The cash exception entry previously appeared for any unsigned renewal. The exception form listed a matching PayNow invoice as cash verification pending, even with a fully approved receipt.

Package Billing now shows the current renewal's approved payment, signature and lesson-hour status, with an action relevant to that record. The section uses the linked invoice or a unique eligible match. It asks staff to identify the invoice when multiple candidates are present. Posted hours are verified from the renewal's ledger entries. The cash exception form and links check the payment method and the evidence available, and legacy links for confirmed noncash payments point back to Package Billing. The finance queue tracks submitted cash exceptions and parent signatures.

Verification includes 61 focused tests, the production build, and isolated browser checks for fully approved PayNow, pending cash approval and missing linked cash payment evidence. The cash flow was requested through the UI and approved and activated in the isolated environment. A separate PayNow case verified the next action after invoice approval and the posted display after signing. Both cases produced one renewal purchase entry.

The rollback code point is `4be87ffa5aee9b36841597cf10ec45f1b2dfe771`.
