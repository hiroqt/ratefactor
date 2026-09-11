# RateFactor — Product Requirements Document

## 1. Product Overview

**RateFactor** is a developer-focused platform for discovering, showcasing, rating, and discussing developer portfolios.

The platform helps developers get their work discovered while giving the community a way to rate projects, leave feedback, and follow portfolio activity.

### Core Value

> **Discover great developer work. Get your work seen. Improve through community feedback.**

---

## 2. Goals

### Primary Goals

* Create a simple platform for discovering developer portfolios.
* Allow developers to submit and showcase their projects.
* Enable community ratings, likes, and comments.
* Provide real-time notifications for portfolio activity.
* Automatically feature portfolios through Daily/Weekly Showcases.
* Provide developers with a dashboard for managing submissions and viewing engagement.
* Keep the MVP operational at **$0 initial infrastructure cost** using free tiers.

### Non-Goals

* Full recruitment/job marketplace functionality.
* Paid portfolio promotion.
* Complex social networking features.
* Advanced recommendation algorithms in the MVP.
* Native mobile applications.

---

# 3. Target Users

### Developers

Want to:

* Showcase their projects.
* Receive ratings and feedback.
* Track engagement.
* Discover other developers.

### Community Members

Want to:

* Discover interesting portfolios.
* Rate projects.
* Like and comment on work.
* Follow developer activity.

### Platform Admin

Needs to:

* Moderate portfolios and comments.
* Manage featured content.
* Review reports.
* Monitor platform health.

---

# 4. Core Features

## 4.1 Portfolio Discovery

Users can browse developer portfolios through:

* Latest submissions
* Highest rated
* Most liked
* Most discussed
* Daily Showcase
* Weekly Showcase

Portfolio cards should expose:

* Developer name
* Portfolio/project title
* Short description
* Technologies used
* Rating
* Like count
* Comment count

---

## 4.2 Portfolio Submission

Authenticated developers can submit a portfolio/project.

### Required

* Title
* Description
* Portfolio/project URL
* GitHub URL
* Technology stack
* Thumbnail/cover image

### Optional

* Demo URL
* Repository URL
* Project category
* Project description
* Additional links

The system validates URLs and prevents duplicate submissions.

---

## 4.3 Rating System

Users can rate portfolios using a defined rating scale.

The system maintains:

* Individual user rating
* Average rating
* Rating count

Users should not be able to repeatedly manipulate the same portfolio's rating.

---

## 4.4 Likes

Authenticated users can like/unlike a portfolio.

Requirements:

* One active like per user per portfolio.
* Toggle like state without page reload.
* Update displayed count immediately.
* Create a notification for the portfolio owner.

---

## 4.5 Comments

Users can:

* Add comments.
* Delete their own comments.
* Report inappropriate comments.

Portfolio owners receive notifications when someone comments.

Admin moderation should be available for reported content.

---

# 5. Real-Time Notification Dashboard

Authenticated developers receive notifications for:

* Portfolio likes
* Portfolio ratings
* New comments
* Showcase selection
* Other relevant portfolio activity

Notifications should appear without requiring a page refresh.

### Notification States

* Unread
* Read

### Dashboard

The developer dashboard displays:

* Notification feed
* Portfolio submissions
* Ratings
* Likes
* Comments
* Showcase history
* Basic engagement statistics

Supabase Realtime is responsible for pushing new notification records to the dashboard.

---

# 6. Daily / Weekly Showcase

The platform automatically selects portfolios for special exposure.

### Daily Showcase

Runs once per day.

### Weekly Showcase

Runs once per week.

### MVP Selection

Use a weighted randomized algorithm rather than completely random selection.

Example factors:

```text
Base randomness
+ portfolio rating
+ engagement
+ submission recency
- previous showcase frequency
```

The exact weighting should be configurable.

### Requirements

* Avoid repeatedly selecting the same portfolio.
* Store every showcase selection.
* Notify the selected developer.
* Display the current showcase prominently.
* Allow admins to override or remove a selection.

Vercel Cron triggers the scheduled selection process.

---

# 7. Authentication

Supabase Auth provides authentication.

### MVP Authentication

* GitHub OAuth
* Email/password may be added later.

Authentication is required for:

* Portfolio submission
* Rating
* Likes
* Comments
* Developer dashboard

Public portfolio browsing remains accessible without authentication.

---

# 8. Analytics

PostHog tracks product engagement such as:

* Page views
* Portfolio views
* Likes
* Comments
* Ratings
* Showcase impressions
* Showcase clicks
* Active users
* Popular portfolios

Analytics should not block core application functionality if unavailable.

---

# 9. Monitoring

Better Stack monitors:

* Website availability
* API availability
* Critical endpoints

The platform should provide:

* Uptime monitoring
* Downtime alerts
* Public status page

---

# 10. Technical Stack

| Layer          | Technology                              |
| -------------- | --------------------------------------- |
| Frontend       | Next.js App Router                      |
| Language       | TypeScript                              |
| Styling        | Tailwind CSS                            |
| UI             | shadcn/ui / Radix UI                    |
| Animation      | Framer Motion                           |
| Backend/API    | Next.js Route Handlers / Server Actions |
| Database       | Supabase PostgreSQL                     |
| Authentication | Supabase Auth                           |
| Realtime       | Supabase Realtime                       |
| Scheduled Jobs | Vercel Cron                             |
| Hosting        | Vercel                                  |
| Analytics      | PostHog                                 |
| Monitoring     | Better Stack                            |
| Source Control | GitHub                                  |

---

# 11. Performance Requirements

The application should:

* Use SSR/Server Components where appropriate.
* Minimize client-side JavaScript.
* Optimistically update likes and ratings.
* Use realtime subscriptions only where required.
* Lazy-load non-critical UI.
* Optimize portfolio images.
* Cache public portfolio data where appropriate.

Target:

* Fast initial page load.
* Near-instant UI feedback for interactions.
* Real-time notifications with minimal latency.

---

# 12. Security Requirements

* Validate all user input server-side.
* Enforce authorization at the database/API layer.
* Use Supabase Row Level Security (RLS).
* Prevent users from modifying other users' portfolios.
* Protect notification records from unauthorized access.
* Rate-limit likes, ratings, comments, and submissions.
* Validate submitted URLs.
* Sanitize user-generated content.
* Keep secrets exclusively in environment variables.

---

# 13. MVP Success Criteria

The MVP is successful when a developer can:

1. Sign in with GitHub.
2. Submit a portfolio.
3. Browse other portfolios.
4. Rate and like portfolios.
5. Comment on portfolios.
6. Receive real-time notifications.
7. View activity from their dashboard.
8. Be selected automatically for a Daily/Weekly Showcase.
9. Receive a notification when selected.

The platform should operate within free-tier infrastructure during the initial MVP stage.

---

# 14. Future Enhancements

* Developer following
* Personalized recommendations
* Portfolio verification
* Advanced ranking
* Achievement/badge system
* Portfolio comparison
* AI-generated portfolio feedback
* Search by technology
* Search by role
* Trending portfolios
* GitHub activity integration
* Public developer profiles
* Email notifications
* Paid promotion
