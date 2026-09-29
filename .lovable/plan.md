# Shared team workspace update

## Changes
- Remove the floating “Ask your CRM” button.
- Move Sign out from the top-right into the bottom of the left navigation.
- Change the default administrator identity to Hammad Zafar, 0300 1394 008, including migration of existing default data.
- Make booking links and booking submissions use the workspace owner, matching the existing shared storage used by leads, visits, tasks, inventory, expenses, and other CRM records.
- Preserve page visibility and role restrictions for each team login.

## Technical details
- Use the resolved workspace owner ID for all shared reads and writes, rather than each team member’s login ID.
- Add database access policies allowing team members to work with their owner’s booking records while retaining existing owner and public booking behavior.
- Keep sign-out handled by the authenticated host and trigger it safely from the embedded navigation.
- Verify the admin and a team-member session share records, then check desktop rendering and build status.
