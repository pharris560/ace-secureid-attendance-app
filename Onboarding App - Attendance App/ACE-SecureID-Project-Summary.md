# ACE SecureID Attendance App - Project Summary

## Project Information
- **Project Path:** `/Users/pamharris/Documents/secureid-app/`
- **Live URL:** https://ace-attendance-7f9cd.web.app
- **GitHub Repository:** git@github.com:pharris560/ace-secureid-attendance-app.git
- **Firebase Console:** https://console.firebase.google.com/project/ace-attendance-7f9cd
- **Firebase Project ID:** ace-attendance-7f9cd

## Tech Stack
- **Frontend:** React (Vite)
- **Backend/Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Hosting:** Firebase Hosting
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **PDF Export:** jspdf + jspdf-autotable
- **Icons:** Lucide React

## Key Commands
```bash
# Development
cd ~/Documents/secureid-app
npm run dev

# Build & Deploy
npm run build && firebase deploy --only hosting

# GitHub Backup
git add -A && git commit -m "description" && git push
```

## Main File Structure
- `src/App.jsx` - Main application component (all features in single file)
- `public/ace-logo.png` - ACE logo image
- `firebase.json` - Firebase configuration
- `package.json` - Dependencies

## Database Structure (Firestore)
```
artifacts/
  ace-attendance-7f9cd/
    public/
      data/
        users/        # User profiles (students, staff, instructors, admins)
        classes/      # Class definitions with geofence settings
        attendance/   # Attendance records with timestamps
```

## User Data Structure
```javascript
{
  name: "Full Name",
  email: "email@example.com",
  studentId: "unique-id",
  roles: ["STUDENT", "STAFF", "INSTRUCTOR", "ADMIN"],  // Multi-role support
  classNames: ["Class1", "Class2"],  // Multi-class enrollment
  photoUrl: "base64 or URL",
  secretKey: "ABC123",  // For token generation
  archived: false
}
```

## Class Data Structure
```javascript
{
  name: "Class Name",
  instructor: "Instructor Name",
  startTime: "09:00",
  endTime: "11:00",
  timezone: "America/New_York",
  latitude: 33.7490,
  longitude: -84.3880,
  geofenceRadius: 100,  // meters
  activeDays: ["Monday", "Wednesday", "Friday"],
  archived: false
}
```

## Attendance Record Structure
```javascript
{
  userId: "user-id",
  userName: "Full Name",
  className: "Class Name",
  timestamp: "2026-01-17T09:00:00",
  status: "PRESENT (AUTO)" | "TARDY (MANUAL)" | "ABSENT" | "EXCUSED",
  arrival: "2026-01-17T09:00:00",
  departure: "2026-01-17T11:00:00",
  arrivalLocation: "ONSITE" | "REMOTE",
  departureLocation: "ONSITE" | "REMOTE",
  distance: 45  // feet from class location
}
```

## Features Implemented

### Dashboard
- Compact stats layout (Present, Tardy, Absent, Excused percentages)
- Per-class attendance pie charts
- Real-time data from Firebase

### Identity Cards (e-Cards)
- Photo upload with base64 storage
- Rotating 6-digit security token (30-second refresh)
- QR code generation
- Multi-role display (STUDENT, STAFF, INSTRUCTOR, ADMIN)
- Multi-class enrollment display
- Student ID field with duplicate checking
- Email card setup instructions (iOS/Android)
- Collapsible class sections
- Search by name, email, student ID, or class
- Active/Archived/All filter
- Sort by first or last name

### Class Manager
- Create/Edit/Archive/Delete classes
- Set class times with timezone support
- Geofence settings (latitude, longitude, radius)
- Active days selection
- CSV bulk import for students
- Manage roster (add/remove students)
- Real-time attendance preview
- Modify attendance for any date
- Attendance summary (Present/Tardy/Absent/Excused counts)

### Check-In/Check-Out System
- **Auto Check-In:** Geofence detection when student is onsite
- **One-Tap Check-In:** Manual button for students
- **Manual Check-Out:** Button on e-card
- **Auto Check-Out (End of Class):** Runs 5 minutes after class ends
- **Bulk Check-Out:** Instructor can check out all students at once
- Location tracking (ONSITE vs REMOTE based on 50ft threshold)

### Reports Page
- Date range filters: Daily, Weekly, Monthly, Custom
- Filter by Class, Status, User (Staff/Student dropdown)
- Search functionality
- Columns: Name, Class, Date, Clock In, In Location, Clock Out, Out Location, Time, Status
- Total Volunteer Hours section with per-user breakdown and grand total
- PDF Export with:
  - ACE logo
  - Summary stats
  - Full attendance table
  - Total Volunteer Hours table
  - Page numbers

### User Profile Modal
- Full name, email, Student ID fields
- Multi-select roles (STUDENT, STAFF, INSTRUCTOR, ADMIN)
- Multi-select class enrollment
- Archive/Restore/Delete options

### iOS Home Screen Support
- URL hash fallback for localStorage persistence
- Detailed email instructions for adding to home screen

## Helper Functions (in App.jsx)
```javascript
// Check if user has a specific role
const hasRole = (user, role) => {
  if (Array.isArray(user.roles)) return user.roles.includes(role);
  return user.role === role;
};

// Check if user is a student
const isStudent = (user) => hasRole(user, "STUDENT");

// Check if user is staff/instructor/admin
const isStaff = (user) => hasRole(user, "STAFF") || hasRole(user, "INSTRUCTOR") || hasRole(user, "ADMINISTRATOR") || hasRole(user, "ADMIN");

// Check if user is enrolled in a class
const isInClass = (user, className) => {
  if (Array.isArray(user.classNames)) return user.classNames.includes(className);
  return user.className === className;
};

// Get all classes for a user (handles old and new format)
const getUserClasses = (user) => {
  if (Array.isArray(user.classNames) && user.classNames.length > 0) return user.classNames;
  return user.className ? [user.className] : [];
};

// Get all roles for a user (handles old and new format)
const getUserRoles = (user) => {
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  return user.role ? [user.role] : ["STUDENT"];
};
```

## Legacy Data Support
The app supports both old single-value format and new multi-value format:
- `role` (string) → `roles` (array)
- `className` (string) → `classNames` (array)

Helper functions automatically handle both formats for backward compatibility.

## Common Tasks

### Add a new user
1. Go to Identity Cards or Class Manager
2. Click "Add User"
3. Fill in name, Student ID, email
4. Select roles and class enrollments
5. Click Save

### Mark attendance
1. Go to Class Manager
2. Click the calendar icon on a class
3. Select the date
4. Click P/A/T/E buttons for each student

### Generate PDF report
1. Go to Reports
2. Select date range and filters
3. Click "Export PDF" button

### Deploy changes
```bash
npm run build && firebase deploy --only hosting
```

### Backup to GitHub
```bash
git add -A && git commit -m "description of changes" && git push
```

## Troubleshooting

### White screen after refresh
- Check browser console for JavaScript errors
- Common cause: syntax errors in App.jsx
- Try hard refresh: Cmd + Shift + R

### Changes not appearing after deploy
- Clear browser cache
- Try incognito/private window
- Verify deploy completed successfully

### Firebase permission errors
- Check Firebase console for rules
- Ensure user is authenticated
- Verify collection paths are correct

## Session History
This app was developed through iterative Claude conversations covering:
- Initial React + Firebase setup
- Dashboard with attendance stats
- Identity Cards with e-card generation
- Class Manager with geofencing
- Reports with PDF export
- Multi-role and multi-class support
- Check-in/Check-out tracking
- Various bug fixes and UI improvements
