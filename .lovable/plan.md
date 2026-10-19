# CareerAI live student dashboard

## What will change

- Extend the signed-in student data layer to load the existing skills, assessment activity, practice sessions, mock interviews, resume analysis, weak areas, and recommendations from Lovable Cloud.
- Rework the dashboard to answer the five requested questions with live, student-owned data only:
  - placement readiness and its seven skill areas
  - weakest measured areas
  - today’s incomplete preparation tasks
  - progress metrics and compact charts
  - upcoming scheduled sessions and the next recommended action
- Derive personalized recommendations from saved recommendations first, then measured low scores and incomplete work. No generic values will be presented as student results.
- Add polished empty states wherever the student has not yet generated enough data.
- Preserve the existing CareerAI editorial typography, colors, navigation, and shared controls.

## Data rules

- Readiness will be calculated only from recorded skill proficiency, latest assessment results, mock interview scores, and resume analysis where they map to a requested area.
- Missing areas will display as unmeasured and will not be treated as zero.
- Progress counts and charts will use persisted assessment answers/results, completed mock interviews, and dated practice sessions.
- All reads continue through the signed-in browser session, so the existing row-level access rules remain in force.

## Verification

- Check the dashboard with a signed-in session and confirm its visible values match that student’s database rows.
- Check a no-data account state for polished empty states.
- Review desktop and mobile layouts and confirm the preview has no build or runtime errors.