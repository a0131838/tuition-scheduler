# Classroom reservations in the admin workspace

Teaching operations staff and management can open **Students & Teaching → Classroom Reservations** in the admin workspace. A management account can open the page without a teacher profile. Accounts with the CS role or workspace can use the same entry. Staff with the CS workspace who sign in to the teacher portal have a shortcut to the admin page.

The admin and Lead Desk pages use the same reservation form, room conflict checks and audit log. Links to edit, cancel and return to the list stay in the workspace where the staff member started. Editing a reservation in one workspace updates the same record in the other.

The server checks the user's booking permissions before displaying or changing reservations. The new route is available to administrators, designated managers, operations administrators, and CS staff. Observer and unrelated staff accounts are outside this access policy.

Verification includes 50 navigation and scheduling tests, a production build, and a browser test in an isolated database. The browser test covers the admin and CS sidebar entries, admin without a teacher profile, operations admin, designated manager, CS workspace, and permission checks. A CS user creates a booking, a teacher lead edits it, and an admin edits the same record.

The rollback code point is `c3c890f5157dd931332a0baeb89cb399701ca931`.
