# CMPT 370 Group Project

---

## Contents

- [Deliverable 0: Part 1](#part-1)
- [Deliverable 0: Part 2](#part-2)
- [Setting Up Project Locally](#project-setup-local)
- [Next.js Starter Guide](#nextjs-tutorial)

## Deliverable 0

### Part 1:

**Members**:

- Akshitha Agooru Kasetty
- Sunil Shastry
- Youssef Elsharabassy
- Jan Perolino
- Joseph Sosulski

**Emails**:

- pyl710@usask.ca (Jan)
- jkr061@usask.ca (Sunil)
- shl824@usask.ca (Akshitha)
- jns678@usask.ca (Joseph)
- kxp382@usask.ca (Youssef)

### Part 2:

**The Workout Planner & Progress tracker is a fitness application that helps users plan their workouts, track performance, and monitor their progress over time.**

- The app includes a workout library with routines, timers and rest intervals
- Allows users to build custom workout plans
- Log sets and repetitions
- Visualize progress

**Fundamental Features:**

- Includes a required user sign - to view, access and manage workout plans, routines, etc.
- A time/calendar system to track and manage the number of days you’ve gone to the gym and worked out.
- Initially have some number of pre-made workout routines set up in the workout library; but also have the option to allow the user create custom workouts.
- Have a todo list based system to have a list of activities and workout tasks to do during the workout.
- Visualized analytics: get the user to setup and create an initial goal and based on previous workout results, display a clean statistical updates for the user in terms of short-comings, goals reached, etc...

**Social Features:**

- Allow the user to customize and manage the public user profile (this is where other users can view a person's basic details, streaks, etc...).
- Possible profile data: user bio, streaks, location (optional), social media links (optional), user tags, posts made by the user, automatic profile picture/placeholder created by the app (using the user's name initials with a custom background color).
- Friend system feature to allow users to add each other via a unique ID like username or email.
- Allow users to post workout routines which includes a like/unlike feature, comment section, and share (URL share?) functionality for other users.
- Have a "feed" page where users can view the posts made by their "friends" - this is where users can also discover new routines and have a "social-media" like interface to spend more time on the app.

**Extra Features:**

- Implement and have an AI feature to recommend and setup custom workout routines for the user based on provided user details - such as a chat bot system or a search system.

**Need and Value:**

- Fitness apps limit customization or lack meaningful progress
- This product fills that gap by combining structured workout planning with detailed performance tracking and visual feedback
- The app encourages consistency and motivation by gamifying your progress

**Stakeholers:**
**Primary Stakeholders**

- Gym-goers
- Fitness beginners
- Experiences Athlete

**Secondary Stakeholders:**

- Personal trainers
- Workout partners
- System maintainers

**Technology requirements:**

- Frontend: Next.js, React.js, TypeScript, TailwindCSS, Tanstack Query, Zod.
- Backend: Next.js, Drizzle ORM, Gemini AI, Zod, JWT.
- Database: PostgreSQL, Neon cloud database, Drizzle ORM.
- Developer Tools: Git, GitLab
- No-code Tools: Figma, LucidChart, draw.io, Discord (with GitLab bot integration), GitLab Issue tracker.

---

## Project Setup (local)

Prerequisites: Before we get into the actual installation and local setup of the project, we will need a couple of third-party APIs. For this project, we will need the API keys from Neon (Cloud-based PostgreSQL database) and the Google Gemini AI

**Neon**:
Register a free account on Neon ([neon.tech](https://neon.tech/)) and create a new project at any Canada/US based location and retrieve the provided **Connection String**. The connection string from your project can be accessed on the "Dashboard" tab within the Neon console. Use the image below as a reference to find the connection string. Please note that the connection string is required for the project to run as expected.

![Neon Connection String Reference](/docs/neon-img.png)

**Google Gemini API Key**:
The Google Gemini API key is required to test and use the AI related features on FitHub - this includes the AI chatbot, AI workout summaries and more. For our use case, a free Google Gemini API key is sufficient. To get your API key, please visit the official Gemini AI documentation, which can be accessed on [Gemini API Key Docs](https://ai.google.dev/gemini-api/docs/api-key); the included link provides basic information about the API and guides on language specific usage. Alternatively, you can directly get an API key from Google's AI Studio at [AI Studio](https://aistudio.google.com/api-keys); Here, you can manage and view all your API keys, make sure to sign in and create a new API key using the "Create API Key" button found on the top right corner; provide the necessary information and accurately create the key. Once created, it should show up below, as seen from the reference image below.

![Google Gemini API Key Reference](/docs/gemini-img.png)

Once you have both the Neon connection string and the Google Gemini AI API key, you can proceed further with the local installation of the project and further setup for usage.

**Local Installation and Setup**:

- Clone the project to your personal computer: `git clone git@git.cs.usask.ca:kxp382/cmpt-370-group-project.git` _(Note: You must have access to the GitLab repository in order to be able to clone it)_
- Navigate to the project directory using the `cd` command: `cd cmpt-370-group-project`
- Make sure Node.js is installed on your computer, you can install the latest version of Node from the official website ([Node.js website](https://nodejs.org/))
- To check if Node (and npm - installed automatically with Node) is correctly installed, run the `node --version` and `npm --version` on your terminal and an apt version number must be displayed
- Install all package dependencies of the project; within the project directory, run the command: `npm install`
- Create an environment variable file with the exact name `.env` in the root of the project directory (`touch .env`)
- Ensure your `.env` file has the following properties with the right values

**`.env` Example**

```bash
# Must be a valid Neon Postgres database URL (connection string)
DATABASE_URL = postgresql://username:password@abcd.c-4.us-something-10.aws.neon.tech/database?sslmode=require&channel_binding=require

# Secret for JWT auth token creation (recommended to have a hashed secret code)
JWT_SECRET = abcd1234

# Must be a valid Google Gemini API Key
GEMINI_API_KEY = AIzaSyB3_example_Key_492x_88LmnOpQrStUv

# Base development URL that is needed for some server components
NEXT_PUBLIC_DEV_BASE_URL = http://localhost:3000
```

With the local installation completed correctly, we will now ensure our database tables are created and seeded for neat and expected usage. In the next few steps, we will use the Drizzle ORM to migrate and seed our database tables. Please follow the next steps as mentioned below.

- Assuming you have the `.env` file setup and filled with the correct values, run the following command: `npm run drizzle:migrate`; this ensures all the necessary database tables are created and setup on your local Neon database
- Next, we will seed the database with predefined workout profiles and exercises, and to do this, simply run the command: `npm run drizzle:seed`; this should automatically create more database tables and fill them with predefined rows.
- Finally, to get started with the application and view it, run the following command: `npm run dev`; this starts up a development server by Next.js on the default PORT of 3000; you can visit `http://localhost:3000/` to view the running application
- Lastly, to actually use the application, you will likely need to create your own account. You can do so on our "Sign Up" page at `http://localhost:3000/signup`
- Alternatively, if you have already created an account previously, you can login to our application using our "Login" page at `http://localhost:3000/login`. Once logged in, you will now be able to create your workouts, view and create new posts, make friends, view calendar based schedule, use our AI features, and more!

## Next.js Tutorial

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
