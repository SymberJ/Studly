import DOMPurify from "dompurify";

/**
 * Notatki przechowują treść jako HTML (efekt edytora WYSIWYG opartego o
 * contentEditable). Ten moduł pilnuje, by ten HTML był bezpieczny przy zapisie
 * i wyświetlaniu, oraz potrafi sprowadzić go z powrotem do czystego tekstu
 * (potrzebnego w eksporcie PDF i w kontekście wysyłanym do Asystenta AI).
 */

/* Dozwolony, celowo wąski zestaw tagów i atrybutów — tyle, ile oferuje pasek
   narzędzi edytora (pogrubienie, kursywa, podkreślenie, kolor, nagłówki,
   listy, akapity). Wszystko spoza tej listy DOMPurify usuwa. */
const ALLOWED_TAGS = [
  "b", "strong", "i", "em", "u", "s",
  "h1", "h2", "h3",
  "p", "br", "div", "span",
  "ul", "ol", "li",
  "blockquote",
];
const ALLOWED_ATTR = ["style"];

/**
 * Oczyszcza HTML przed zapisem/wyświetleniem. Usuwa skrypty, zdarzenia inline
 * (onerror, onclick…) i wszystko spoza dozwolonej listy — chroni przed XSS,
 * gdy treść notatki trafi z powrotem do DOM przez dangerouslySetInnerHTML.
 */
export function sanitizeNoteHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}

/**
 * Sprowadza HTML notatki do czystego tekstu z zachowaniem podziału na linie.
 * Używane przy eksporcie do PDF oraz w kontekście dla AI, gdzie tagi byłyby
 * szumem. Bloki (akapity, nagłówki, elementy listy) rozdzielamy nową linią.
 */
export function noteHtmlToText(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = sanitizeNoteHtml(html);
  // <br> → nowa linia; bloki domykane nową linią
  tmp.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  tmp.querySelectorAll("p, div, h1, h2, h3, li, blockquote").forEach((el) => {
    el.append("\n");
  });
  const text = tmp.textContent ?? "";
  // zbij nadmiarowe puste linie i przytnij brzegi
  return text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
}

/**
 * Czy dany ciąg wygląda na HTML (zawiera znacznik). Starsze notatki zapisane
 * jako czysty tekst nie mają tagów — wtedy przy wyświetlaniu traktujemy je
 * jako tekst (z zachowaniem białych znaków), a nie jako HTML.
 */
export function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s);
}
