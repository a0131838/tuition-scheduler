# TASK-20260712 Miniapp Course Template Configuration

## Goal

Activate the parent miniapp course-reminder consent entry with the official WeChat template selected by Zhao, while keeping outbound delivery disabled until the template keyword IDs are confirmed.

## Scope

- Configure `WECHAT_TEMPLATE_COURSE_REMINDER` locally and in the production deployment environment.
- Preserve all five subscription template variables whenever the production deploy script rewrites `.env`.
- Fetch the requested deployment branch explicitly so a narrow server fetch refspec cannot leave production on an older remote-tracking commit.
- Verify the subscription configuration reports the course group as configured.
- Keep request, finance, invoice, and receipt groups hidden until their own official template IDs are supplied.

## Safety Boundaries

- This release enables the consent entry only; it does not send a WeChat message.
- No course, package, finance, Ticket, attendance, payroll, or parent-link data is modified.
- Outbound delivery remains blocked until the selected template's keyword field IDs and payload mapping are verified.

## Verification

- Shell syntax check for `deploy_app.sh`.
- Shell syntax check for `quick_deploy.sh` and exact local/origin/server commit alignment.
- Subscription configuration check with the provided course template ID.
- Production runtime configuration reports one of five templates configured after deployment.
- PM2 and `https://sgtmanage.com/admin/login` remain healthy.
