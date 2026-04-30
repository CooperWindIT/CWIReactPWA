import { useMemo, useState } from "react";
import "./rem.css";

const initialReminders = [
  {
    id: 1,
    title: "Doctor Appointment",
    date: "2026-04-09",
    time: "10:30",
    category: "Health",
  },
  {
    id: 2,
    title: "Team Meeting",
    date: "2026-04-12",
    time: "15:00",
    category: "Work",
  },
  {
    id: 3,
    title: "Pay Electricity Bill",
    date: "2026-04-15",
    time: "19:00",
    category: "Personal",
  },
];

function getMonthDays(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const cells = [];

  for (let i = 0; i < startPadding; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month, day));
  }

  return cells;
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

export default function ReminderScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [reminders, setReminders] = useState(initialReminders);
  const [form, setForm] = useState({
    title: "",
    date: formatDate(new Date()),
    time: "09:00",
    category: "Personal",
  });

  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth]);

  const remindersForSelectedDate = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.date === selectedDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [reminders, selectedDate]
  );

  const upcomingReminders = useMemo(
    () =>
      [...reminders]
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
        .slice(0, 5),
    [reminders]
  );

  const monthLabel = currentMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  function changeMonth(direction) {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1)
    );
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleAddReminder(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    const newReminder = {
      id: Date.now(),
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      category: form.category,
    };

    setReminders((current) => [...current, newReminder]);
    setSelectedDate(form.date);
    setForm((current) => ({
      ...current,
      title: "",
    }));
  }

  function handleDeleteReminder(id) {
    setReminders((current) => current.filter((reminder) => reminder.id !== id));
  }

  return (
    <div className="reminder-page">
      <aside className="reminder-sidebar">
        <div className="brand-card">
          <p className="eyebrow">Daily Planner</p>
          <h1>Reminder Center</h1>
          <p className="muted">
            Track events, bills, meetings, and personal tasks in one place.
          </p>
        </div>

        <form className="reminder-form" onSubmit={handleAddReminder}>
          <h2>Add Reminder</h2>

          <label>
            Title
            <input
              name="title"
              value={form.title}
              onChange={handleInputChange}
              placeholder="Enter reminder title"
            />
          </label>

          <label>
            Date
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleInputChange}
            />
          </label>

          <label>
            Time
            <input
              type="time"
              name="time"
              value={form.time}
              onChange={handleInputChange}
            />
          </label>

          <label>
            Category
            <select
              name="category"
              value={form.category}
              onChange={handleInputChange}
            >
              <option value="Personal">Personal</option>
              <option value="Work">Work</option>
              <option value="Health">Health</option>
              <option value="Finance">Finance</option>
            </select>
          </label>

          <button type="submit">Save Reminder</button>
        </form>

        <div className="upcoming-card">
          <h2>Upcoming</h2>
          <div className="upcoming-list">
            {upcomingReminders.map((reminder) => (
              <div key={reminder.id} className="upcoming-item">
                <strong>{reminder.title}</strong>
                <span>{reminder.date}</span>
                <span>{reminder.time} | {reminder.category}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="reminder-main">
        <div className="calendar-header">
          <div>
            <p className="eyebrow">Calendar View</p>
            <h2>{monthLabel}</h2>
          </div>

          <div className="calendar-actions">
            <button type="button" onClick={() => changeMonth(-1)}>
              Previous
            </button>
            <button type="button" onClick={() => changeMonth(1)}>
              Next
            </button>
          </div>
        </div>

        <div className="weekday-row">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="weekday-cell">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {monthDays.map((date, index) => {
            if (!date) {
              return <div key={`blank-${index}`} className="calendar-cell empty" />;
            }

            const dateKey = formatDate(date);
            const dayReminders = reminders.filter((reminder) => reminder.date === dateKey);
            const isSelected = selectedDate === dateKey;
            const isToday = formatDate(new Date()) === dateKey;

            return (
              <button
                type="button"
                key={dateKey}
                className={`calendar-cell ${isSelected ? "selected" : ""} ${
                  isToday ? "today" : ""
                }`}
                onClick={() => setSelectedDate(dateKey)}
              >
                <div className="calendar-day-top">
                  <span>{date.getDate()}</span>
                  {dayReminders.length > 0 && (
                    <span className="badge">{dayReminders.length}</span>
                  )}
                </div>

                <div className="calendar-preview">
                  {dayReminders.slice(0, 2).map((reminder) => (
                    <span key={reminder.id} className="preview-chip">
                      {reminder.title}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <section className="selected-day-card">
          <div className="selected-day-heading">
            <div>
              <p className="eyebrow">Selected Date</p>
              <h3>{selectedDate}</h3>
            </div>
          </div>

          <div className="selected-reminder-list">
            {remindersForSelectedDate.length === 0 ? (
              <p className="empty-state">No reminders for this date yet.</p>
            ) : (
              remindersForSelectedDate.map((reminder) => (
                <article key={reminder.id} className="reminder-card">
                  <div>
                    <h4>{reminder.title}</h4>
                    <p>{reminder.time} | {reminder.category}</p>
                  </div>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleDeleteReminder(reminder.id)}
                  >
                    Delete
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


