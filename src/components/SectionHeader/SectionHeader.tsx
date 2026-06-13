import { formatLongDate } from "../../lib/utils";
import { useT } from "../../lib/i18n/context";

type SectionHeaderProps = {
  title: string;
  subtitle: string;
  /** Emoji dopisywane po tytule (jak machająca rączka w Dashboardzie). */
  emoji?: string;
};

/**
 * Wspólny baner nagłówkowy kategorii: data + tytuł (+ emoji) + podtytuł.
 * Style klas .section-header-glass* są w src/styles/Global.css.
 */
export default function SectionHeader({ title, subtitle, emoji }: SectionHeaderProps) {
  const { lang } = useT();
  return (
    <div className="section-header-glass">
      <div className="section-header-glass__left">
        <p className="section-header-glass__date">{formatLongDate(lang)}</p>
        <h2 className="section-header-glass__title">
          {title}
          {emoji ? ` ${emoji}` : ""}
        </h2>
        <p className="section-header-glass__subtitle">{subtitle}</p>
      </div>
    </div>
  );
}
