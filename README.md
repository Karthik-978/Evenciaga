# 🎪 Evenciaga

**Evenciaga** is a full-stack volunteer management platform designed to simplify the way organizations create events, manage volunteers, track attendance, and coordinate event activities from a centralized system.

It provides separate experiences for organizers and volunteers, making event coordination more structured, efficient, and accessible.

## 🚀 Key Features

### 🔐 Authentication & User Management

- Secure user authentication
- User profiles and role-based access
- Separate organizer and volunteer experiences

### 📅 Event Management

- Create and manage events
- View event details
- Organize event information in one place
- Manage event participation

### 👥 Volunteer Management

- Volunteer registration and profiles
- Manage volunteers participating in events
- Track volunteer involvement
- Volunteer dashboard

### ✅ Attendance Management

- Record volunteer attendance
- Track participation across events
- Maintain attendance information for organizers

### 🏆 Certificates

- Track volunteer participation
- Certificate-related records for completed events

### 🔔 Alerts & Communication

- Event-related alerts
- Important updates for volunteers
- Centralized event information

### 📊 Dashboards

Organizers and volunteers get dedicated dashboards to access the information relevant to their role.

## 🛠️ Technology Stack

### Frontend

- React.js
- Vite
- Tailwind CSS
- React Query

### Backend & Database

- Firebase Authentication
- Firebase Firestore
- Express.js
- REST APIs

### Mobile

- Capacitor
- Android

### Deployment & Development

- Git & GitHub
- Node.js
- npm

## 🏗️ System Architecture

```text
                    EVENCIAGA
                        │
            ┌───────────┴───────────┐
            │                       │
       ORGANIZER                VOLUNTEER
            │                       │
            └───────────┬───────────┘
                        │
                  React Frontend
                        │
                 React Query/API
                        │
                  Express Backend
                        │
                  Firebase Services
                        │
              ┌─────────┴─────────┐
              │                   │
        Authentication        Firestore
```

## 📂 Core Modules

```text
Authentication
      ↓
Events
      ↓
Volunteers
      ↓
Attendance
      ↓
Certificates
      ↓
Alerts & Notifications
      ↓
Dashboards
```

## 📱 Mobile Application

Evenciaga can also be packaged as an Android application using **Capacitor**, extending the platform beyond the web environment.

## 🎯 Problem It Solves

Managing volunteers manually through spreadsheets, messages, and separate tools can become difficult as the number of events and volunteers increases.

Evenciaga brings these activities together into a centralized platform, reducing manual coordination and making event management easier for organizers and volunteers.

## 🔮 Future Improvements

- Advanced analytics and reporting
- Push notifications
- Improved attendance verification
- Enhanced certificate generation
- Event discovery and search
- More advanced volunteer analytics
- Performance and mobile UI improvements

## 👨‍💻 Project

Evenciaga was developed as a full-stack software project focused on solving practical event and volunteer management problems through a centralized digital platform.

**Repository:** [GitHub](https://github.com/Karthik-978/Evenciaga)
