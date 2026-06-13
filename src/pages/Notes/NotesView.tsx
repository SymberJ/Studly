import React, { useState } from "react";
import { isoToDisplay, uid } from "../../lib/utils";
import type { NoteEntry } from "../../app/types";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import NoteEditor from "../../components/NoteEditor/NoteEditor";
import { sanitizeNoteHtml, noteHtmlToText, looksLikeHtml } from "../../lib/noteFormat";
import { useData } from "../../lib/DataContext";
import { useT } from "../../lib/i18n/context";
import "./NotesView.css";

export default function NotesView() {
  const { courses, setCourses, notes, setNotes } = useData();
  const { t } = useT();
  const [newCourseName, setNewCourseName] = useState("");
  const [selectedId, setSelectedId] = useState<string>(courses[0]?.id || "");
  const [content, setContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const PREVIEW_LENGTH = 200;

  const toggleExpand = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCourse = courses.find((c) => c.id === selectedId);
  const currentNotes = notes
    .filter((n) => n.courseId === selectedId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const exportToPDF = async (note: NoteEntry) => {
    const { jsPDF } = await import("jspdf"); // ładowany dopiero przy eksporcie (mniejszy bundle startowy)
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(selectedCourse?.name || t("notes.pdfTitleFallback"), 10, 20);
    doc.setFontSize(10);
    doc.text(`${t("notes.pdfDate")} ${isoToDisplay(note.date)}`, 10, 30);
    doc.line(10, 35, 200, 35);
    doc.setFontSize(12);
    const plain = looksLikeHtml(note.content) ? noteHtmlToText(note.content) : note.content;
    const splitText = doc.splitTextToSize(plain, 180);
    doc.text(splitText, 10, 45);
    doc.save(`${t("notes.pdfTitleFallback")}_${note.date}_${selectedCourse?.name || t("notes.pdfNoName")}.pdf`);
  };

  const addCourse = () => {
    if (!newCourseName.trim()) return;
    const nc = { id: uid(), name: newCourseName };
    setCourses([nc, ...courses]);
    setSelectedId(nc.id);
    setNewCourseName("");
  };

  const deleteCourse = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t("notes.confirmDeleteCourse"))) return;
    setCourses(courses.filter((c) => c.id !== courseId));
    setNotes(notes.filter((n) => n.courseId !== courseId));
    if (selectedId === courseId) setSelectedId("");
  };

  const saveNote = () => {
    // walidujemy na podstawie tekstu — pusty edytor bywa "<br>" lub "<div></div>"
    if (!noteHtmlToText(content).trim() || !selectedId) return;
    const clean = sanitizeNoteHtml(content);
    if (editingNoteId) {
      setNotes(notes.map((n) => (n.id === editingNoteId ? { ...n, content: clean } : n)));
      setEditingNoteId(null);
    } else {
      const nn = { id: uid(), courseId: selectedId, date: new Date().toISOString().slice(0, 10), content: clean };
      setNotes([nn, ...notes]);
    }
    setContent("");
  };

  const startEditing = (note: NoteEntry) => {
    setEditingNoteId(note.id);
    // starsze notatki to czysty tekst — zamieniamy znaki nowej linii na <br>,
    // by edytor pokazał je tak, jak były zapisane
    const html = looksLikeHtml(note.content)
      ? note.content
      : note.content.replace(/\n/g, "<br>");
    setContent(sanitizeNoteHtml(html));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setContent("");
  };

  return (
<div className="view-section-wrap">
  <SectionHeader
    title={t("notes.title")}
    subtitle={t("notes.subtitle")}
    emoji="📝"
  />

      <div className="note-unique-container" style={{ animation: "taskAppear 0.6s ease-out both" }}>
        <aside className="note-unique-sidebar">
          <div className="note-unique-add-box" style={{ borderRadius: "12px", padding: "14px" }}>
            <input
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              placeholder={t("notes.newCoursePlaceholder")}
              style={{ fontSize: "14px" }}
            />
            <button onClick={addCourse} style={{ height: "32px", fontSize: "12px" }}>{t("notes.add")}</button>
          </div>
          <div className="note-unique-list">
            {courses.map((c, index) => (
              <div
                key={c.id}
                className="note-unique-tab-wrapper SBR-wrapper"
                style={{
                  "--n": index,
                  animation: `taskAppear 0.4s ease-out both ${index * 0.05}s`
                } as React.CSSProperties}
              >
                <div className="note-icon-box SBR-icon">📚</div>
                <button
                  className={`note-unique-tab SBR-tab ${selectedId === c.id ? "is-active" : ""}`}
                  onClick={() => {
                    setSelectedId(c.id);
                    cancelEdit();
                  }}
                  style={{ borderRadius: "12px", fontSize: "14px" }}
                >
                  {c.name}
                </button>
                <button className="note-unique-course-del SBR-del" onClick={(e) => deleteCourse(c.id, e)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="note-unique-main">
          {selectedCourse ? (
            <div className="note-unique-content-fade" style={{ animation: "taskAppear 0.5s ease-out both" }}>
              <div className="note-unique-editor EDT-box" style={{
                padding: "24px",
                minHeight: "400px",
                borderRadius: "20px",
                display: "flex",
                flexDirection: "column"
              }}>
                <header className="note-unique-editor-header EDT-header" style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "800" }}>{editingNoteId ? t("notes.editingTitle") : selectedCourse.name}</h3>
                  <small className="note-unique-date-tag EDT-date" style={{ fontSize: "11px" }}>
                    {editingNoteId ? t("notes.editMode") : `${isoToDisplay(new Date().toISOString().slice(0, 10))} 📅`}
                  </small>
                </header>

                <NoteEditor
                  value={content}
                  onChange={setContent}
                  placeholder={t("notes.writePlaceholder")}
                />

                <footer className="note-unique-editor-footer EDT-footer" style={{ marginTop: "15px" }}>
                  {editingNoteId && (
                    <button className="btn-secondary" onClick={cancelEdit} style={{ height: "42px" }}>
                      {t("common.cancel")}
                    </button>
                  )}
                  <button className="note-unique-btn-save EDT-save" onClick={saveNote} style={{ height: "42px", padding: "0 24px" }}>
                    <span>{editingNoteId ? "🔄" : "💾"}</span> {editingNoteId ? t("notes.update") : t("notes.save")}
                  </button>
                </footer>
              </div>

              <div className="note-unique-history" style={{ marginTop: "20px" }}>
                <h4 className="note-unique-history-title">{t("notes.history")}</h4>
                {currentNotes.length > 0 ? (
                  currentNotes.map((n, idx) => (
                    <div
                      key={n.id}
                      className="note-unique-past-note"
                      style={{
                        animation: `taskAppear 0.5s ease-out both ${idx * 0.08}s`,
                        padding: "14px 20px",
                        borderRadius: "12px",
                        marginBottom: "8px"
                      }}
                    >
                      <header className="past-note-header" style={{ marginBottom: "8px", border: "none" }}>
                        <small className="past-note-date" style={{ fontSize: "9px", opacity: 0.7 }}>{isoToDisplay(n.date)}</small>
                        <div className="note-past-actions">
                          <button className="btn-edit" onClick={() => startEditing(n)}>{t("notes.edit")}</button>
                          <button className="btn-delete" onClick={() => setNotes(notes.filter((x) => x.id !== n.id))}>{t("notes.delete")}</button>
                          <button className="btn-pdf" onClick={() => exportToPDF(n)}>PDF 📥</button>
                        </div>
                      </header>
                      {(() => {
                        const isHtml = looksLikeHtml(n.content);
                        const plain = isHtml ? noteHtmlToText(n.content) : n.content;
                        const isLong = plain.length > PREVIEW_LENGTH;
                        const isExpanded = expandedNotes.has(n.id);
                        return (
                          <>
                            {isHtml ? (
                              isLong && !isExpanded ? (
                                // skrócony podgląd długiej notatki — jako tekst,
                                // by uniknąć ucięcia HTML w połowie znacznika
                                <p className="note-rich note-rich--clamp"
                                   style={{ margin: "0 0 8px 0" }}>
                                  {plain.slice(0, PREVIEW_LENGTH) + "…"}
                                </p>
                              ) : (
                                <div
                                  className="note-rich"
                                  style={{ margin: "0 0 8px 0" }}
                                  dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(n.content) }}
                                />
                              )
                            ) : (
                              <p style={{ whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: "1.6", margin: "0 0 8px 0" }}>
                                {isLong && !isExpanded ? plain.slice(0, PREVIEW_LENGTH) + "…" : plain}
                              </p>
                            )}
                            {isLong && (
                              <button
                                onClick={() => toggleExpand(n.id)}
                                style={{
                                  background: "rgba(129,140,248,0.1)",
                                  border: "1px solid rgba(129,140,248,0.2)",
                                  borderRadius: "8px",
                                  color: "var(--primary)",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  padding: "4px 12px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  fontFamily: "inherit",
                                }}
                              >
                                <i className={`ti ${isExpanded ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: "12px" }} />
                                {isExpanded ? t("notes.collapse") : t("notes.expand")}
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ))
                ) : (
                  <div className="note-empty-history">
                    <p>{t("notes.empty")}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="note-welcome-state" style={{ animation: "taskAppear 0.5s ease-out both" }}>
              <div className="note-visual-icon">📝</div>
              <p>{t("notes.welcome")}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
