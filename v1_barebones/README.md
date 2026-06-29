# BUNK

BUNK is an attendance planner for students who need to track classes, plan absences, and stay above attendance requirements. It combines a timetable, subject-wise attendance records, safety predictions, and a what-if leave planner into one mobile-first web app that feels native.

## What The App Does

- Tracks subject attendance using attended and missed class counts.
- Calculates current attendance percentage for every subject.
- Shows how many more classes can be skipped while staying above a target attendance percentage.
- Predicts whether skipping a day is safe, risky, or unsafe.
- Predicts whether skipping a subject that day is safe, risky, or unsafe.
- Lets you mark each class as attended or skipped.
- Lets you plan full-day or individual-class absences in advance.
- Shows the impact of planned absences before they become real misses.
- Supports editable attendance rules, semester dates, holidays, and timetable slots.
- Saves attendance, settings, attendance marks, and planned absences on supabase


## Database Schema

Tables: 
TIMETABLE: id: int8, creator: uuid of user, sem1, sem2, sem3 ... sem8: (json object)

each sem column should be like this: 
start date: string "yyyymmdd"
end date: string "yyyymmdd"
minimum attendance: int
recommended attendance: int
timetable {
    monday [[class1 (name string), start: (24 h time string "hhmm"), end: (24 h time string "hhmm")], ...]
    tuesday []
    wednesday []
    thursday []
    friday []
}
absences {date string "yyyymmdd": [classes missed (class name string)], ...}


## Main Screens

### Home / Today

The Today screen is the daily dashboard.

- Greets the user based on time of day.
- shows the current month and year 
- Shows a 15-day horizontal date cards selector centered around the dashboard date, displays each date and day in a card 
- Shows the selected day's attendance safety status.
- Lists all scheduled classes for the selected day.
- Detects the currently active class based on the current time.
- Marks a class as `Attend` or `Skip`.
- Updates subject attendance counts when a class is marked.
- Removes a class from planned absences once it is manually marked.
- Allows planning or clearing a full-day absence.

Safety labels:

- `Safe`: skipping the day keeps subjects above the safety line.
- `Partial`: skipping may fall below the recommended buffer but stays above the minimum.
- `Unsafe`: skipping would drop at least one subject below the minimum attendance.
- `Holiday`: no scheduled classes for that date.

### Skips / Subjects

The Subjects screen is the subject-wise attendance budget.

- Lists every subject with predicted attendance after planned absences.
- Shows attendance percentage for each subject.
- Shows missed classes out of total held classes.
- Shows current skip balance for each subject.
- Shows planned misses per subject.
- Lets the user choose a target percentage from `60%` to `90%` for specific subjects.
- Calculates how many more classes can be skipped for the selected subject at that target.
- Provides subject chips for quickly switching the selected subject.

### Absence Calendar + Planner

The Calendar screen is used to plan absences visually.

- Shows a month grid.
- Colors each date based on predicted attendance % safety.
- Shows a dot when a date has planned absences.
- Lets the user select any date in the month.
- Marks or clears the whole selected day as absent.
- Lets user Skip individual classes as planned absences.
- Shows the attendance impact for the selected date. Previews percentage changes such as `78.5% -> 76.2%`.
- Distinguishes full-day planned absence, partial planned absence, and unplanned days.


The Planner is just a range selector on the calendar

- Lets the user choose a start date and end date.
- Counts all classes missed inside that date range.
- Groups the impact by subject.
- Shows projected attendance after taking the leave.
- Gives a recommendation for the selected range.
- Warns if any subject falls below the safety line or college minimum.

### Settings

The Settings screen controls the app's attendance rules and timetable.

- Updates the minimum attendance percentage.
- Updates the recommended safety percentage.
- Changes semester start and semester end dates.
- Adds and removes individual holidays.
- Adds and removes long holiday ranges. 
- Adds new timetable classes.
- Edits existing timetable classes.
- Deletes timetable classes.
- Creates a new subject automatically when a timetable slot uses a new subject code.

## Attendance Logic

The core attendance calculations live in `lib/logic/attendance_engine`.

Important functions include:

- `classesFor(date)`: returns scheduled classes for a date, excluding holidays and dates outside the semester.
- `activeClassFor(dateTime)`: finds the class currently happening at a given time.
- `safetyFor(date)`: checks whether missing a date is safe using current attendance.
- `predictedSafetyFor(date)`: checks safety after including already planned absences.
- `predictedSubjects()`: returns subject records after applying planned misses.
- `plannedMissCounts()`: counts future planned misses per subject.
- `isPlannedAbsent(date, subject)`: checks whether a subject is planned absent on a date.
- `isFullPlannedAbsence(date)`: checks whether every class on a date is planned absent.
- `markFor(date, slot)`: retrieves a saved attendance mark for a class.
- `impactForRange(start, end)`: calculates leave impact across a date range.
- `bestSkipDays(weekStart)`: returns the best three skip days in a week based on safety and class count.

Subject calculations live in `lib/models/attendance_models.dart`.

- `attendance`: percentage from attended and missed counts.
- `held`: total classes held.
- `skipsLeft()`: classes that can still be missed while staying above a threshold.
- `recoveryClasses()`: attended classes needed to recover to a threshold.
- `copyAfterMisses()`: creates a projected record after planned misses.

## Data Model

The app uses these main models:

- `SubjectRecord`: subject name, attended count, missed count, professor, minimum target, and safety target.
- `TimetableSlot`: subject, weekday, time interval, and optional room.
- `TimeInterval`: start and end time in `HHMM` format.
- `AppSettings`: semester dates, holidays, and weekly timetable.
- `PlannerImpact`: planned misses, safety status, and recommendation text.
- `SessionStatus`: `attended`, `missed`, `cancelled`, or `pending`.
- `DaySafety`: `holiday`, `safe`, `partial`, or `unsafe`.

## Persistence

BUNK stores data locally through the `AttendanceStore` interface.

Saved data includes:

- Subject attendance records.
- Planned absences.
- Per-class attendance marks.
- Semester settings.
- Holidays.
- Timetable slots.

Storage implementations:

- Web: saves to browser `localStorage`.
- Desktop/mobile IO platforms: saves a JSON file in the user's app data, local app data, home directory, or current directory depending on platform environment.
- Stub: fallback store for unsupported platforms.


The default timetable covers Monday through Friday and includes theory classes and lab blocks.

## Project Structure

```text
lib/
  main.dart                         App entry point and theme
  data/seed_data.dart               Default subjects and timetable
  logic/attendance_engine.dart      Attendance prediction and planning logic
  models/attendance_models.dart     Core app models
  screens/home_screen.dart          State owner and tab navigation
  screens/today_screen.dart         Daily dashboard
  screens/subjects_screen.dart      Subject skip budget
  screens/calendar_screen.dart      Absence calendar
  screens/planner_screen.dart       What-if leave planner
  screens/settings_screen.dart      Semester, holiday, and timetable settings
  storage/                          Local persistence implementations
  utils/date_utils.dart             Date and time formatting helpers
  widgets/                          Shared UI components and safety styling
```

## Running The App

Install dependencies:

```bash
flutter pub get
```

Run on the connected device or emulator:

```bash
flutter run
```

Run in Chrome:

```bash
flutter run -d chrome
```

Analyze the project:

```bash
dart analyze
```

Run tests:

```bash
flutter test
```

## Tech Stack

- Flutter
- Dart
- Material 3
- Local JSON persistence
- Browser localStorage for web builds

## Current App Identity

- App title: `Bunk Budget`
- Visible header: `BUNK`
- Theme: dark interface with orange safety/action accents
- Primary user flow: check today's classes, mark attendance, plan absences, and tune the timetable as the semester changes
