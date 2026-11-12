# Classroom booking edit

In the previous release, selecting Edit on a reservation reloaded the list with a populated form above it. On a narrow viewport the new view opened at the top, above the edit form. The staff member could miss the form and interpret the action as incomplete.

Edit booking now links to the edit form on the same page. The form identifies the organization, room and existing booking start. Staff can choose Save changes or Cancel editing. The save action shows validation errors inside the form and keeps the entered values. After a save, the browser opens the booking list at its confirmation. If a booking moves outside the current week, the list opens at the new booking date.

Verification covers desktop and narrow viewports, populated form values, cancelling an edit, rejected times, successfully moving a booking to a later week and creating a booking. Browser writes use the isolated test database. The classroom reservation service retains its existing authorization, conflict checks and audit entries.

The rollback code point is `6403a160d272ba39d920594df974b1f119a6900d`.
