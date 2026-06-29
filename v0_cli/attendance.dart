const version = "0.0.1";
const minimumAttendance = 0.75;

final semesterStartDate = DateTime(2025, 7, 21);
final semesterEndDate = DateTime(2026, 5, 15);

class TimeInterval {
  final String start;
  final String end;

  const TimeInterval({required this.start, required this.end});
}

class TimeTable {
  final Map<String, Map<String, TimeInterval>> schedule;

  TimeTable(this.schedule);
}

class AttendanceStats {
  final String subject;
  final int held;
  final int attended;
  final int skipped;
  final int remainingClasses;
  final int remainingSkips;
  final int classesToRecover;
  final int daysToRecover;
  final double percentage;

  const AttendanceStats({
    required this.subject,
    required this.held,
    required this.attended,
    required this.skipped,
    required this.remainingClasses,
    required this.remainingSkips,
    required this.classesToRecover,
    required this.daysToRecover,
    required this.percentage,
  });
}

final defaultTimetable = TimeTable({
  'Monday': {
    "CHE": TimeInterval(start: "0900", end: "0950"),
    "MAT": TimeInterval(start: "0950", end: "1040"),
    "CPI": TimeInterval(start: "1050", end: "1140"),
    "CHEM_LAB_1": TimeInterval(start: "1350", end: "1630"),
  },
  'Tuesday': {
    "PSUC_LAB": TimeInterval(start: "0900", end: "1140"),
    "MAT": TimeInterval(start: "1300", end: "1350"),
    "BIO": TimeInterval(start: "1350", end: "1440"),
    "BET": TimeInterval(start: "1450", end: "1540"),
    "EVS": TimeInterval(start: "1540", end: "1630"),
  },
  'Wednesday': {
    "CHE": TimeInterval(start: "0900", end: "0950"),
    "PSUC": TimeInterval(start: "0950", end: "1040"),
    "BET": TimeInterval(start: "1050", end: "1140"),
    "BIO": TimeInterval(start: "1140", end: "1230"),
    "EG_LAB": TimeInterval(start: "1350", end: "1630"),
  },
  'Thursday': {
    "EVS": TimeInterval(start: "1300", end: "1350"),
    "MAT": TimeInterval(start: "1350", end: "1440"),
    "PSUC": TimeInterval(start: "1450", end: "1540"),
    "BET": TimeInterval(start: "1540", end: "1630"),
  },
  'Friday': {
    "BIO": TimeInterval(start: "0900", end: "0950"),
    "MAT": TimeInterval(start: "0950", end: "1040"),
    "CHE": TimeInterval(start: "1050", end: "1140"),
    "PSUC": TimeInterval(start: "1140", end: "1230"),
  },
});

final List<DateTime> holidayDates = [
  DateTime(2025, 10, 1),
  DateTime(2025, 10, 2),
  DateTime(2025, 8, 15),
  DateTime(2025, 8, 27),
  DateTime(2025, 11, 1),
  DateTime(2026, 1, 26),
  DateTime(2026, 3, 4),
  DateTime(2026, 3, 20),
  DateTime(2026, 4, 3),
];

final List<({DateTime start, DateTime end})> longHolidays = [
  (start: DateTime(2025, 11, 12), end: DateTime(2026, 1, 4)),
  (start: DateTime(2026, 4, 27), end: DateTime(2026, 5, 15)),
];

bool isSameDate(DateTime a, DateTime b) {
  return a.year == b.year && a.month == b.month && a.day == b.day;
}

bool isHoliday(DateTime date) {
  return holidayDates.any((holiday) => isSameDate(holiday, date));
}

DateTime dateAfter(DateTime startDate, int daysAfter) {
  return startDate.add(Duration(days: daysAfter));
}

String weekdayName(DateTime date) {
  const weekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  return weekdays[date.weekday - 1];
}

String findWeekdayFromStart(DateTime startDate, int daysAfter) {
  final targetDate = dateAfter(startDate, daysAfter);
  return weekdayName(targetDate);
}

bool isWithinRange(DateTime date, DateTime rangeStart, DateTime rangeEnd) {
  return !date.isBefore(rangeStart) && !date.isAfter(rangeEnd);
}

bool isInLongHoliday(DateTime date) {
  return longHolidays.any(
    (range) => isWithinRange(date, range.start, range.end),
  );
}

int GetTotalDays(DateTime startDate, DateTime endDate) {
  var total = 0;
  var current = DateTime(startDate.year, startDate.month, startDate.day);
  final last = DateTime(endDate.year, endDate.month, endDate.day);

  while (!current.isAfter(last)) {
    final weekday = current.weekday;
    final isWeekend =
        weekday == DateTime.saturday || weekday == DateTime.sunday;

    if (!isWeekend && !isHoliday(current) && !isInLongHoliday(current)) {
      total += 1;
    }

    current = current.add(const Duration(days: 1));
  }

  return total;
}

Map<String, int> GetClassesPerWeek(TimeTable myTimeTable) {
  final subjects = <String, int>{};

  for (final daySchedule in myTimeTable.schedule.values) {
    daySchedule.forEach((subject, _) {
      subjects[subject] = (subjects[subject] ?? 0) + 1;
    });
  }

  return subjects;
}

Map<String, int> GetTotalSubjectClasses(
  TimeTable myTimeTable,
  DateTime startDate,
  DateTime endDate,
) {
  final subjects = <String, int>{};
  var current = DateTime(startDate.year, startDate.month, startDate.day);
  final last = DateTime(endDate.year, endDate.month, endDate.day);

  while (!current.isAfter(last)) {
    final weekday = current.weekday;
    final isWeekend =
        weekday == DateTime.saturday || weekday == DateTime.sunday;

    if (!isWeekend && !isHoliday(current) && !isInLongHoliday(current)) {
      final dayName = weekdayName(current);
      final daySchedule = myTimeTable.schedule[dayName];

      if (daySchedule != null) {
        daySchedule.forEach((subject, _) {
          subjects[subject] = (subjects[subject] ?? 0) + 1;
        });
      }
    }

    current = current.add(const Duration(days: 1));
  }

  return subjects;
}

Map<String, int> GetSubjectClassesUntil(
  TimeTable myTimeTable,
  DateTime startDate,
  DateTime endDate,
) {
  if (endDate.isBefore(startDate)) {
    return {};
  }

  return GetTotalSubjectClasses(myTimeTable, startDate, endDate);
}

Map<String, int> GetRemainingSubjectClasses(
  TimeTable myTimeTable,
  DateTime currentDate,
  DateTime endDate,
) {
  return GetTotalSubjectClasses(
    myTimeTable,
    currentDate.add(const Duration(days: 1)),
    endDate,
  );
}

int GetClassesToRecover(int held, int attended, double target) {
  if (held == 0 || attended / held >= target) {
    return 0;
  }

  return ((target * held - attended) / (1 - target)).ceil();
}

int GetDaysToRecover(
  TimeTable myTimeTable,
  String subject,
  DateTime currentDate,
  DateTime endDate,
  int classesToRecover,
) {
  if (classesToRecover <= 0) {
    return 0;
  }

  var needed = classesToRecover;
  var days = 0;
  var date = currentDate.add(const Duration(days: 1));

  while (!date.isAfter(endDate)) {
    final weekday = date.weekday;
    final isWeekend =
        weekday == DateTime.saturday || weekday == DateTime.sunday;

    if (!isWeekend && !isHoliday(date) && !isInLongHoliday(date)) {
      final daySchedule = myTimeTable.schedule[weekdayName(date)] ?? {};
      if (daySchedule.containsKey(subject)) {
        needed -= 1;
      }
    }

    days += 1;
    if (needed <= 0) {
      return days;
    }

    date = date.add(const Duration(days: 1));
  }

  return -1;
}

AttendanceStats BuildAttendanceStats({
  required TimeTable timetable,
  required String subject,
  required DateTime currentDate,
  required DateTime startDate,
  required DateTime endDate,
  required int skipped,
  double target = minimumAttendance,
}) {
  final heldMap = GetSubjectClassesUntil(timetable, startDate, currentDate);
  final remainingMap = GetRemainingSubjectClasses(
    timetable,
    currentDate,
    endDate,
  );
  final held = heldMap[subject] ?? 0;
  final attended = held - skipped;
  final remainingClasses = remainingMap[subject] ?? 0;
  final requiredFutureAttends = (target * (held + remainingClasses) - attended)
      .ceil();
  final remainingSkips =
      remainingClasses - requiredFutureAttends.clamp(0, remainingClasses);
  final classesToRecover = GetClassesToRecover(held, attended, target);
  final daysToRecover = GetDaysToRecover(
    timetable,
    subject,
    currentDate,
    endDate,
    classesToRecover,
  );

  return AttendanceStats(
    subject: subject,
    held: held,
    attended: attended,
    skipped: skipped,
    remainingClasses: remainingClasses,
    remainingSkips: remainingSkips,
    classesToRecover: classesToRecover,
    daysToRecover: daysToRecover,
    percentage: held == 0 ? 100 : attended / held * 100,
  );
}

void main() {
  final myTimetable = defaultTimetable;
  final startDate = semesterStartDate;
  final endDate = semesterEndDate;
  final totalSubjectClasses = GetTotalSubjectClasses(
    myTimetable,
    startDate,
    endDate,
  );

  // print("classesPerWeek $classesPerWeek\n");
  // totalSubjectClasses.forEach((subject, classes) {
  //   print("$subject $classes");
  // });

  // testing stuff
  var T = totalSubjectClasses['MAT'] ?? 0;
  var H = 98;
  var A = 70;
  var R = T - H;
  var P = A / H;
  var p = 0.75; // classes to attend
  var M = (T * (1 - p)).floor();
  var missed = H - A;
  var x = ((p * H - A) / (1 - p));
  var P_ = (A + x) / (H + x);

  print(
    "\nyou can only miss $M classes for this subject, $missed missed classes",
  );
  print("attendance for math is $P");
  print(
    "you must attend $x more classes in a row out of $R classes remaining to get an attendance of $P_\n",
  );
}
