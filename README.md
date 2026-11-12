# OrbitLearn

**Keep every student in orbit.** OrbitLearn is a classroom platform that acts before report cards do: it spots students who are slipping, alerts parents and teachers with an action plan and a one-click meeting link, and turns every class into an AI recap that builds into a lifelong study guide.

This repository is a working demo built by Framelight Tech Solutions Inc.

## Try it

Open the site and pick a role on the sign-in page, or sign in with any demo account (password `demo1234`):

| Role | Email | What to try |
| --- | --- | --- |
| Student | student@orbitlearn.demo | Study Vault, flashcards, quizzes, exam prep, AI assistant |
| Parent | parent@orbitlearn.demo | At-risk alert with action plan, book a meeting, parent hub |
| Teacher | teacher@orbitlearn.demo | Roster risk flags, notify a parent, generate and approve an AI recap, grade, attendance |
| School admin | admin@orbitlearn.demo | School dashboard, daily risk check, urgent alerts, email log, school level switch |

## Features

- **Proactive alerts:** absences, missing work and low grades combine into a risk level. Teachers or admins notify the family in one click, or run a daily check that does it automatically.
- **Parent and teacher workflow:** alerts include reasons, an action plan and a meeting link; teachers confirm requests and families get a confirmation email.
- **AI class recaps:** a teacher pastes lesson notes, the assistant drafts a recap, key terms, flashcards and a quiz, and the teacher approves before students see it. Attached homework notifies parents.
- **Study Vault and exam prep:** every recap is saved and searchable; one click builds a printable study guide and practice test for a class.
- **AI Teaching Assistant:** answers questions from the student's own recaps, makes flashcards and quizzes, and won't do homework for them.
- **Community:** shoutouts, class and school announcements, urgent alerts, and a parent hub.
- **Every school level:** elementary, middle, high school and university. Switching the level changes labels (parents become advisors) and recap detail.

## Notes on this demo

- The AI assistant is **simulated** with text analysis so it runs for free. Swap the functions in `src/ai.js` for a model API to make it fully AI-powered.
- Emails are written to the admin's **Email log** instead of being sent.
- Data lives in memory and a local file. It resets on redeploy and refreshes every few days. Admins can reset it from Settings.

## Run locally

Requires Node 18 or newer. There are no dependencies.

```
npm start          # http://localhost:3000
npm test           # API tests
node test/ui.js    # browser click-through (needs Playwright)
```

## Deploy on Render

In Render, choose **New → Blueprint** and pick this repository. `render.yaml` creates a free web service. Free services sleep after 15 minutes without visits, so the first load after a break takes about a minute.
