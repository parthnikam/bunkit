import 'dart:convert';
import 'dart:io';

import 'attendance.dart';

const stateFileName = 'attendance_state.json';

class CliState {
  DateTime currentDate;
  final Map<String, int> skippedBySubject;

  CliState({required this.currentDate, required this.skippedBySubject});

  Map<String, dynamic> toJson() {
    return {
      'currentDate': formatDate(currentDate),
      'skippedBySubject': skippedBySubject,
    };
  }

  static CliState fromJson(Map<String, dynamic> json) {
    final skippedJson = json['skippedBySubject'] as Map<String, dynamic>? ?? {};

    return CliState(
      currentDate: DateTime.parse(json['currentDate'] as String),
      skippedBySubject: skippedJson.map(
        (subject, skipped) => MapEntry(subject, skipped as int),
      ),
    );
  }
}

void main() {
  runAttendanceCli();
}

void runAttendanceCli() {
  final timetable = defaultTimetable;
  final state = loadInitialState(timetable);

  print('BUNK attendance simulator');
  print(
    'Minimum attendance: ${(minimumAttendance * 100).toStringAsFixed(0)}%\n',
  );

  while (!state.currentDate.isAfter(semesterEndDate)) {
    final daySchedule = getDayClasses(timetable, state.currentDate);
    if (daySchedule.isEmpty) {
      state.currentDate = nextClassDate(
        timetable,
        state.currentDate.add(const Duration(days: 1)),
      );
      saveState(state);
      continue;
    }

    clearScreen();
    showDay(timetable, state.currentDate, daySchedule, state.skippedBySubject);

    final skipFullDay = askDayChoice(timetable, state);
    final missedSubjects = skipFullDay
        ? daySchedule.keys.toSet()
        : chooseMissedClasses(timetable, state, daySchedule);

    for (final subject in missedSubjects) {
      state.skippedBySubject[subject] =
          (state.skippedBySubject[subject] ?? 0) + 1;
    }

    print('\nUpdated attendance after ${formatDate(state.currentDate)}:');
    printStatsTable(
      timetable,
      state.currentDate,
      daySchedule.keys,
      state.skippedBySubject,
    );

    state.currentDate = nextClassDate(
      timetable,
      state.currentDate.add(const Duration(days: 1)),
    );
    saveState(state);
    print('');
  }

  saveState(state);
  print('Semester complete.');
}

CliState loadInitialState(TimeTable timetable) {
  final saveFile = File(stateFileName);
  final freshState = CliState(
    currentDate: nextClassDate(timetable, semesterStartDate),
    skippedBySubject: {},
  );

  if (!saveFile.existsSync()) {
    return freshState;
  }

  print('Found saved attendance data in $stateFileName.');
  final useExisting = askYesNo('Use existing data? [Y/N]: ');

  if (!useExisting) {
    saveState(freshState);
    return freshState;
  }

  try {
    final json =
        jsonDecode(saveFile.readAsStringSync()) as Map<String, dynamic>;
    final loadedState = CliState.fromJson(json);
    loadedState.currentDate = nextClassDate(timetable, loadedState.currentDate);
    return loadedState;
  } on FormatException {
    print('Saved data is invalid. Starting from scratch.');
    saveState(freshState);
    return freshState;
  }
}

void saveState(CliState state) {
  final encoder = JsonEncoder.withIndent('  ');
  File(stateFileName).writeAsStringSync(encoder.convert(state.toJson()));
}

Map<String, TimeInterval> getDayClasses(TimeTable timetable, DateTime date) {
  final classes = timetable.schedule[weekdayName(date)] ?? {};
  final sorted = classes.entries.toList()
    ..sort((a, b) => a.value.start.compareTo(b.value.start));

  return Map.fromEntries(sorted);
}

DateTime nextClassDate(TimeTable timetable, DateTime fromDate) {
  var date = DateTime(fromDate.year, fromDate.month, fromDate.day);

  while (!date.isAfter(semesterEndDate)) {
    final isWeekend =
        date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;
    final hasClasses = getDayClasses(timetable, date).isNotEmpty;

    if (!isWeekend &&
        !isHoliday(date) &&
        !isInLongHoliday(date) &&
        hasClasses) {
      return date;
    }

    date = date.add(const Duration(days: 1));
  }

  return date;
}

void showDay(
  TimeTable timetable,
  DateTime currentDate,
  Map<String, TimeInterval> daySchedule,
  Map<String, int> skippedBySubject,
) {
  print(line());
  print('${weekdayName(currentDate)} | ${formatDate(currentDate)}');
  print(line());
  printClassesTable(daySchedule);
  print('');
  printStatsTable(timetable, currentDate, daySchedule.keys, skippedBySubject);
  print(line());
}

void printClassesTable(Map<String, TimeInterval> daySchedule) {
  final rows = daySchedule.entries
      .map(
        (entry) => [
          entry.key,
          formatTime(entry.value.start),
          formatTime(entry.value.end),
        ],
      )
      .toList();

  printTable(['Class', 'Start', 'End'], rows);
}

void printStatsTable(
  TimeTable timetable,
  DateTime currentDate,
  Iterable<String> subjects,
  Map<String, int> skippedBySubject,
) {
  final sortedSubjects = subjects.toList()..sort();
  final rows = sortedSubjects.map((subject) {
    final stats = BuildAttendanceStats(
      timetable: timetable,
      subject: subject,
      currentDate: currentDate,
      startDate: semesterStartDate,
      endDate: semesterEndDate,
      skipped: skippedBySubject[subject] ?? 0,
    );

    return [
      stats.subject,
      (stats.held + stats.remainingClasses).toString(),
      stats.held.toString(),
      stats.attended.toString(),
      '${stats.percentage.toStringAsFixed(1)}%',
      stats.skipped.toString(),
      stats.remainingSkips.toString(),
      stats.daysToRecover == -1 ? 'N/A' : stats.daysToRecover.toString(),
    ];
  }).toList();

  printTable([
    'Class',
    'Total',
    'Held',
    'Attended',
    'Attendance',
    'Skipped',
    'Skips Left',
    'Days Recover',
  ], rows);
}

bool askDayChoice(TimeTable timetable, CliState state) {
  while (true) {
    stdout.write(
      'Skip the full day? [Y/N]  Enter=yes  S stats  W week  Q quit: ',
    );
    final input = (stdin.readLineSync() ?? '').trim().toLowerCase();

    if (input.isEmpty || input == 'y') {
      return true;
    }

    if (input == 'n') {
      return false;
    }

    if (input == 's') {
      printAllSubjectStats(timetable, state);
      continue;
    }

    if (input == 'w') {
      printWeeklyTimetable(timetable);
      continue;
    }

    if (input == 'q') {
      saveState(state);
      print('\nSaved to $stateFileName. Bye.');
      exit(0);
    }

    print('Please enter Y, N, S, W, or Q.');
  }
}

Set<String> chooseMissedClasses(
  TimeTable timetable,
  CliState state,
  Map<String, TimeInterval> daySchedule,
) {
  final classes = daySchedule.entries.toList();
  final selected = <int>{};

  while (true) {
    print('\nSelect classes you will miss.');
    print(
      'Type numbers to toggle boxes, Y/Enter to proceed, S stats, W week.\n',
    );

    for (var i = 0; i < classes.length; i++) {
      final mark = selected.contains(i) ? 'x' : ' ';
      final entry = classes[i];
      final time =
          '${formatTime(entry.value.start)}-${formatTime(entry.value.end)}';
      print(
        '${(i + 1).toString().padLeft(2)}. [$mark] ${entry.key.padRight(12)} $time',
      );
    }

    stdout.write('\nChoice: ');
    final input = (stdin.readLineSync() ?? '').trim().toLowerCase();

    if (input.isEmpty || input == 'y') {
      return selected.map((index) => classes[index].key).toSet();
    }

    if (input == 's') {
      printAllSubjectStats(timetable, state);
      continue;
    }

    if (input == 'w') {
      printWeeklyTimetable(timetable);
      continue;
    }

    final numbers = input
        .split(RegExp(r'[\s,]+'))
        .where((value) => value.isNotEmpty)
        .map(int.tryParse)
        .whereType<int>();

    for (final number in numbers) {
      final index = number - 1;
      if (index < 0 || index >= classes.length) {
        continue;
      }

      if (selected.contains(index)) {
        selected.remove(index);
      } else {
        selected.add(index);
      }
    }
  }
}

void printAllSubjectStats(TimeTable timetable, CliState state) {
  print('\nAll subject stats as of ${formatDate(state.currentDate)}:');
  printStatsTable(
    timetable,
    state.currentDate,
    getAllSubjects(timetable),
    state.skippedBySubject,
  );
  print('');
}

Set<String> getAllSubjects(TimeTable timetable) {
  final subjects = <String>{};

  for (final daySchedule in timetable.schedule.values) {
    subjects.addAll(daySchedule.keys);
  }

  return subjects;
}

void printWeeklyTimetable(TimeTable timetable) {
  final timeSlots = getAllTimeSlots(timetable);
  final rows = <List<String>>[];

  for (final day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
    final daySchedule = timetable.schedule[day] ?? {};
    final row = [day];

    for (final slot in timeSlots) {
      final subjects = daySchedule.entries
          .where(
            (entry) =>
                entry.value.start == slot.start && entry.value.end == slot.end,
          )
          .map((entry) => '[${entry.key}]')
          .join(' ');

      row.add(subjects.isEmpty ? '' : subjects);
    }

    rows.add(row);
  }

  print('\nWeekly timetable:');
  printTable(['Day', ...timeSlots.map((slot) => slot.label)], rows);
  print('');
}

List<({String start, String end, String label})> getAllTimeSlots(
  TimeTable timetable,
) {
  final slots = <String, ({String start, String end, String label})>{};

  for (final daySchedule in timetable.schedule.values) {
    for (final interval in daySchedule.values) {
      final key = '${interval.start}-${interval.end}';
      slots[key] = (
        start: interval.start,
        end: interval.end,
        label: '${formatTime(interval.start)}-${formatTime(interval.end)}',
      );
    }
  }

  final sorted = slots.values.toList()
    ..sort((a, b) {
      final startCompare = a.start.compareTo(b.start);
      return startCompare == 0 ? a.end.compareTo(b.end) : startCompare;
    });

  return sorted;
}

bool askYesNo(String prompt) {
  while (true) {
    stdout.write(prompt);
    final input = (stdin.readLineSync() ?? '').trim().toLowerCase();

    if (input.isEmpty || input == 'y') {
      return true;
    }

    if (input == 'n') {
      return false;
    }

    print('Please enter Y or N.');
  }
}

void printTable(List<String> headers, List<List<String>> rows) {
  final widths = List<int>.generate(
    headers.length,
    (index) => headers[index].length,
  );

  for (final row in rows) {
    for (var i = 0; i < row.length; i++) {
      if (row[i].length > widths[i]) {
        widths[i] = row[i].length;
      }
    }
  }

  String formatRow(List<String> row) {
    return row
        .asMap()
        .entries
        .map((entry) => entry.value.padRight(widths[entry.key]))
        .join(' | ');
  }

  print(formatRow(headers));
  print(widths.map((width) => '-' * width).join('-+-'));

  for (final row in rows) {
    print(formatRow(row));
  }
}

String formatTime(String value) {
  if (value.length != 4) {
    return value;
  }

  return '${value.substring(0, 2)}:${value.substring(2)}';
}

String formatDate(DateTime date) {
  return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

String line() {
  return '-' * 78;
}

void clearScreen() {
  if (stdout.hasTerminal) {
    stdout.write('\x1B[2J\x1B[0;0H');
  }
}
