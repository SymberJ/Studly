import { useEffect, useRef } from "react";
import { useT } from "../../lib/i18n/context";
import { sanitizeNoteHtml } from "../../lib/noteFormat";
import "./NoteEditor.css";

/* Paleta kolorów tekstu — w tonacji marki + kilka czytelnych akcentów.
   Pierwszy wpis ("") oznacza powrót do koloru domyślnego. */
const COLORS = ["", "#fb7185", "#fbbf24", "#34d399", "#38bdf8", "#a78bfa"];

type Props = {
  /** Aktualna treść w formacie HTML (już oczyszczona). */
  value: string;
  /** Wywoływane przy każdej zmianie treści — przekazuje oczyszczony HTML. */
  onChange: (html: string) => void;
  placeholder?: string;
};

/**
 * Lekki edytor tekstu sformatowanego oparty o contentEditable.
 * Obsługuje: pogrubienie, kursywę, podkreślenie, przekreślenie, nagłówki
 * (tytuł/podtytuł), listy oraz kolor tekstu. Treść trzymana jest jako HTML,
 * który przy zapisie i wyświetlaniu przechodzi przez sanitizeNoteHtml.
 */
export default function NoteEditor({ value, onChange, placeholder }: Props) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);

  /* Synchronizujemy DOM tylko gdy zewnętrzna wartość różni się od zawartości
     edytora. Bez tego warunku kursor „skakałby" na koniec przy każdym wpisaniu
     znaku (React przerysowywałby innerHTML w trakcie pisania). */
  useEffect(() => {
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (el) onChange(sanitizeNoteHtml(el.innerHTML));
  };

  /* Wykonuje komendę formatowania na zaznaczeniu i utrzymuje fokus w edytorze.
     execCommand jest oznaczone jako przestarzałe, ale pozostaje wspierane we
     wszystkich przeglądarkach i jest najprostszą drogą bez ciężkich bibliotek. */
  const run = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const setBlock = (tag: "h1" | "h2" | "p") => run("formatBlock", tag);

  return (
    <div className=" note-editor">
      <div className="note-editor__toolbar" role="toolbar" aria-label={t("notes.fmt.body")}>
        <div className="note-editor__group">
          <button type="button" className="note-editor__btn" title={t("notes.fmt.bold")}
            aria-label={t("notes.fmt.bold")} onMouseDown={(e) => e.preventDefault()}
            onClick={() => run("bold")}><i className="ti ti-bold" /></button>
          <button type="button" className="note-editor__btn" title={t("notes.fmt.italic")}
            aria-label={t("notes.fmt.italic")} onMouseDown={(e) => e.preventDefault()}
            onClick={() => run("italic")}><i className="ti ti-italic" /></button>
          <button type="button" className="note-editor__btn" title={t("notes.fmt.underline")}
            aria-label={t("notes.fmt.underline")} onMouseDown={(e) => e.preventDefault()}
            onClick={() => run("underline")}><i className="ti ti-underline" /></button>
          <button type="button" className="note-editor__btn" title={t("notes.fmt.strike")}
            aria-label={t("notes.fmt.strike")} onMouseDown={(e) => e.preventDefault()}
            onClick={() => run("strikeThrough")}><i className="ti ti-strikethrough" /></button>
        </div>

        <span className="note-editor__sep" aria-hidden="true" />

        <div className="note-editor__group">
          <button type="button" className="note-editor__btn note-editor__btn--text" title={t("notes.fmt.title")}
            aria-label={t("notes.fmt.title")} onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBlock("h1")}>{t("notes.fmt.title")}</button>
          <button type="button" className="note-editor__btn note-editor__btn--text" title={t("notes.fmt.subtitle")}
            aria-label={t("notes.fmt.subtitle")} onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBlock("h2")}>{t("notes.fmt.subtitle")}</button>
          <button type="button" className="note-editor__btn note-editor__btn--text" title={t("notes.fmt.body")}
            aria-label={t("notes.fmt.body")} onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBlock("p")}>{t("notes.fmt.body")}</button>
        </div>

        <span className="note-editor__sep" aria-hidden="true" />

        <div className="note-editor__group">
          <button type="button" className="note-editor__btn" title={t("notes.fmt.bulleted")}
            aria-label={t("notes.fmt.bulleted")} onMouseDown={(e) => e.preventDefault()}
            onClick={() => run("insertUnorderedList")}><i className="ti ti-list" /></button>
          <button type="button" className="note-editor__btn" title={t("notes.fmt.numbered")}
            aria-label={t("notes.fmt.numbered")} onMouseDown={(e) => e.preventDefault()}
            onClick={() => run("insertOrderedList")}><i className="ti ti-list-numbers" /></button>
        </div>

        <span className="note-editor__sep" aria-hidden="true" />

        <div className="note-editor__group note-editor__colors" title={t("notes.fmt.color")}>
          {COLORS.map((c) => (
            <button
              key={c || "default"}
              type="button"
              className={`note-editor__color ${c ? "" : "note-editor__color--reset"}`}
              style={c ? { background: c } : undefined}
              title={c ? t("notes.fmt.color") : t("notes.fmt.clearColor")}
              aria-label={c ? `${t("notes.fmt.color")} ${c}` : t("notes.fmt.clearColor")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run("foreColor", c || "inherit")}
            >{c ? "" : <i className="ti ti-ban" />}</button>
          ))}
        </div>
      </div>

      <div
        ref={ref}
        className="note-editor__area"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
      />
    </div>
  );
}
