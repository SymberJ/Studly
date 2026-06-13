import { useState, useEffect } from "react";
import "./CalendarView.css";
import type { CalendarEvent } from "../../app/types";
import { useData } from "../../lib/DataContext";
import { formatLongDate, dateLocale, uid } from "../../lib/utils";
import { getCalendarEvents, saveCalendarEvents } from "../../lib/repo";
import { useT } from "../../lib/i18n/context";

const PRESET_COLORS = [
  "#6c5ce7",
  "#ff4757",
  "#2ed573",
  "#ffa502",
  "#1e90ff",
  "#e84393",
];

const DAY_LABELS: Record<string, string[]> = {
  pl: ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

export default function CalendarView() {
  const { courses } = useData();
  const { t, lang } = useT();
  const [showEventList, setShowEventList] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>(() => getCalendarEvents());

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [eventForm, setEventForm] = useState({
    title: "",
    time: "",
    courseId: "",
    color: PRESET_COLORS[0],
    description: ""
  });

  useEffect(() => {
    saveCalendarEvents(events);
  }, [events]);

  const formatMonth = (date: Date) => {
    const m = date.toLocaleString(dateLocale(lang), { month: 'long' });
    return m.charAt(0).toUpperCase() + m.slice(1);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDay = new Date(year, month, 1).getDay();
  const startIdx = startingDay === 0 ? 6 : startingDay - 1;

  const calendarDays = [];
  for (let i = 0; i < startIdx; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setEditingEventId(null);
    setEventForm({ title: "", time: "", courseId: "", color: PRESET_COLORS[0], description: "" });
    setShowEventList(false);
    setShowModal(true);
  };

  const handleEditClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setSelectedDate(event.date);
    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      time: event.time,
      courseId: event.courseId,
      color: event.color || PRESET_COLORS[0],
      description: event.description || ""
    });
    setShowEventList(false);
    setShowModal(true);
  };

  const handleMoreClick = (e: React.MouseEvent, day: number) => {
    e.stopPropagation();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setShowEventList(true);
    setShowModal(true);
  };

  const saveEvent = () => {
    if (!eventForm.title) return;
    if (editingEventId) {
      setEvents(events.map(ev => ev.id === editingEventId ? { ...ev, ...eventForm, date: selectedDate } : ev));
    } else {
      setEvents([...events, { id: uid(), ...eventForm, date: selectedDate }]);
    }
    setShowModal(false);
  };

  const deleteEvent = () => {
    if (editingEventId) {
      setEvents(events.filter(ev => ev.id !== editingEventId));
      setShowModal(false);
    }
  };

  return (
    <div className="view-section-wrap animate-fade-in">
      <div className="cal-glass-header">
        <div className="cal-info">
          <p className="section-header-glass__date">{formatLongDate(lang)}</p>
          <h2 className="cal-display-month">
            {formatMonth(currentDate)} 🗓️
          </h2>
          <p className="cal-year-label">{year}</p>
          <div className="cal-accent-bar"></div>
        </div>
        <div className="cal-nav-group">
          <button className="cal-nav-arrow" onClick={() => setCurrentDate(new Date(year, month - 1))}>&larr;</button>
          <button className="cal-nav-today" onClick={() => setCurrentDate(new Date())}>{t("calendar.today")}</button>
          <button className="cal-nav-arrow" onClick={() => setCurrentDate(new Date(year, month + 1))}>&rarr;</button>
        </div>
      </div>

      <div className="cal-main-container">
        <div className="cal-grid-labels">
          {(DAY_LABELS[lang] ?? DAY_LABELS.pl).map(d => (
            <div key={d} className="cal-label-item">{d}</div>
          ))}
        </div>

        <div className="cal-grid-body">
          {calendarDays.map((day, idx) => {
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : "";
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            const visibleEvents = dayEvents.slice(0, 3);
            const moreCount = dayEvents.length - 3;

            return (
              <div
                key={idx}
                className={`cal-grid-cell ${!day ? 'is-empty' : ''} ${isToday ? 'is-today' : ''}`}
                onClick={() => day && handleDayClick(day)}
              >
                {day && (
                  <>
                    <div className="cell-day-number-wrap"><span className="cell-day-number">{day}</span></div>
                    <div className="cell-events-list">
                      {visibleEvents.map(ev => (
                        <div
                          key={ev.id}
                          className="cal-pill-event"
                          style={{ backgroundColor: ev.color || PRESET_COLORS[0] }}
                          onClick={(e) => handleEditClick(e, ev)}
                        >
                          <div className="pill-content-left">
                            <span className="pill-dot">★</span>
                            <span className="pill-label">{ev.title}</span>
                          </div>
                          {ev.time && <span className="pill-time">{ev.time}</span>}
                        </div>
                      ))}
                      {moreCount > 0 && (
                        <div className="cal-more-indicator" onClick={(e) => handleMoreClick(e, day)}>
                          + {moreCount} {t("calendar.more")}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="cal-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="cal-modal-window" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h3>{showEventList ? t("calendar.events") : (editingEventId ? t("calendar.editPlan") : t("calendar.newPlan"))}</h3>
              <p className="modal-date-subtitle">{selectedDate}</p>
            </header>
            <div className="modal-body">
              {showEventList ? (
                <div className="modal-event-list">
                  {events.filter(e => e.date === selectedDate).map(ev => (
                    <div key={ev.id} className="modal-event-item-wrap">
                      <div
                        className="cal-pill-event"
                        style={{ backgroundColor: ev.color || PRESET_COLORS[0], cursor: "pointer" }}
                        onClick={(e) => handleEditClick(e, ev)}
                      >
                        <div className="pill-content-left">
                          <span className="pill-dot">★</span>
                          <span>{ev.title}</span>
                        </div>
                        {ev.time && <span className="pill-time-modal">{ev.time}</span>}
                      </div>
                      {ev.description && (
                        <p className="event-list-desc-preview">{ev.description}</p>
                      )}
                    </div>
                  ))}
                  <div className="modal-footer">
                    <button onClick={() => setShowEventList(false)} className="btn-primary-glass">{t("calendar.addNew")}</button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    className="cal-input"
                    placeholder={t("calendar.titlePlaceholder")}
                    value={eventForm.title}
                    onChange={e => setEventForm({...eventForm, title: e.target.value})}
                  />

                  <textarea
                    className="cal-input cal-textarea"
                    placeholder={t("calendar.descPlaceholder")}
                    rows={3}
                    value={eventForm.description}
                    onChange={e => setEventForm({...eventForm, description: e.target.value})}
                  />

                  <div className="color-picker-wrap">
                    <span className="input-label-mini">{t("calendar.eventColor")}</span>
                    <div className="color-presets-grid">
                      {PRESET_COLORS.map(c => (
                        <div
                          key={c}
                          className={`color-swatch ${eventForm.color === c ? 'is-active' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setEventForm({...eventForm, color: c})}
                        />
                      ))}
                    </div>
                  </div>

<div className="modal-row">
  <input
    type="time"
    className="cal-input"
    value={eventForm.time}
    onChange={e => setEventForm({...eventForm, time: e.target.value})}
  />
  <select
    className="cal-input select-styled"
    value={eventForm.courseId}
    onChange={e => setEventForm({...eventForm, courseId: e.target.value})}
  >
    <option value="" className="select-option">{t("calendar.coursePlaceholder")}</option>
    {courses.map(c => (
      <option key={c.id} value={c.id} className="select-option">
        {c.name}
      </option>
    ))}
  </select>
</div>
                  <div className="modal-footer">
                    {editingEventId && <button onClick={deleteEvent} className="btn-delete">{t("common.delete")}</button>}
                    <div className="footer-right">
                      <button onClick={() => setShowModal(false)} className="btn-text">{t("common.cancel")}</button>
                      <button onClick={saveEvent} className="btn-primary-glass">{editingEventId ? t("common.save") : t("common.add")}</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
