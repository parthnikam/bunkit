# BUNK.it

## 1. Core idea: attendance is a “skip budget”

Your college requires: 60%
That means: 40%

So if a subject has 40 total classes in the semester: 16

You can miss **16 classes max** in that subject.

The app should treat attendance like a **bank account**:

```text
Total classes in semester = total money
Allowed absences = spendable balance
Classes missed = money already spent
Remaining safe skips = balance left
```

So the main number is not just attendance percentage. The main number is:

```text
How many more classes can I safely miss?
```

---

# 2. Why missing early, middle, and late feels different

Mathematically, if the total number of classes is fixed, missing 1 class is always 1 missed class.

But practically, the timing matters because your **recovery power changes**.

### Case A: Missing classes early chances your percentages heavily

### Case B: Missing classes in the middle of the semester is where the app becomes strategic.

### Case C: Missing classes near the end is just a user decision to miss or not to miss

# 3. The key formulas the app needs

Let:

```text
H = classes held so far
A = classes attended so far
M = classes missed so far
R = remaining classes
T = total projected classes = H + R
target = 0.75
```

Current attendance: A/H
Total classes you must attend by the end: 0.75 * T
Minimum future classes you must attend: max(0, 0.75T - A)
Future classes you can still skip: R - max(0, 0.75T - A)


---

# 4. Subject-wise attendance matters more than total attendance

Most colleges do attendance subject-wise, not just overall.

So the app should track each subject separately:

```text
Maths:
Held: 20
Attended: 15
Attendance: 75%
Safe skips left: 9

Physics:
Held: 18
Attended: 11
Attendance: 61.1%
Safe skips left: 4

DSA:
Held: 22
Attended: 13
Attendance: 59.1%
Recovery needed: attend next 2 classes
```

The app should not just say:

```text
You can skip Friday.
```

It should check:

```text
Friday has:
- Maths: safe
- Physics: risky
- DSA: unsafe

Recommendation: Do not skip full Friday. Skip only Maths if needed.
```

This is where the product becomes useful.

---

# 5. Recovery math: “How many classes do I need to attend to get back above 60%?”

x = (p * H - A)/(1 - p)

Example:

```text
Held = 20
Attended = 11
Attendance = 55%
```

[
x \geq \frac{0.60(20)-11}{0.40}
]

[
x \geq \frac{12-11}{0.40}
]

[
x \geq 2.5
]

So you need to attend **3 classes in a row** to recover.

The app should show this very clearly:

```text
DSA is below 60%.
Attend the next 3 DSA classes to recover.
Do not skip DSA this week.
```

---

# 6. Main app concept

## App name idea: BUNK
## Bunk your classes without worrying for attendance.


# 7. Core user flow

The first-time setup should be simple:

```text
1. Enter college attendance rule
   Example: minimum 60%

2. Add semester dates
   Start date, end date, holidays if known
   We'll take care of it so that the user doesn't have to worry 

3. Add weekly timetable as an image or manually
    if image -> use OCR to extract times and classes 
    else -> have a time table editor
    
    for testing, the timetable is hardcoded

4. Add current attendance if semester has already started
   DSA: held 12, attended 9
   Maths: held 10, attended 7

5. App generates skip plan for each week or however the user may prefer

```

After setup, the app becomes a daily assistant.

---

# 8. Main dashboard

The home screen should not show too much.

It should show the student’s current situation in one glance:

```text
Today: Tuesday

Safe to skip today?
Partially safe

Classes today:
9:00 DSA       Do not skip
10:00 Maths    Safe
11:00 DBMS     Safe
2:00 Physics   Risky

Overall status:
DSA       61%   2 skips left
Maths     78%   8 skips left
DBMS      72%   6 skips left
Physics   63%   1 skip left
```

The most important UX principle:

```text
Do not make students calculate.
Tell them the decision.
```

---

# 9. Features:

- The user gives the timetable, and the app highlights days that you can skip, or subjects that you can skip
- Every subject has a balance of classes you can skip based on calculation. And when the user chooses to skip tomorrow, the app simulates the probabilites and allows the user to see it before they confirm.
- Student can plan a date for Can I go home for 3 days next week? and the app calculates the missed attendance classes along with the percentages
- The app should not only track attendance. It should suggest the best days to skip.
- When the student goes below the target, the app should show debt and the number of days they have to attend in order to recover their attendance

---

# 10. MVP feature set

For the first version, build only this:

```text
1. Add subjects
2. Add minimum attendance percentage
3. Add timetable
4. Add semester start/end dates
5. Mark class as attended/skipped/cancelled
6. Show subject-wise attendance
7. Show safe skips left
8. Show safe/risky/unsafe days
9. What-if planner for taking leave
10. Notifications before risky classes
```

---
