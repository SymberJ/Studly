import { useState } from "react";
import SectionHeader from "../../components/SectionHeader/SectionHeader";
import { useToast } from "../../components/Toast/Toast";
import { useT } from "../../lib/i18n/context";
import "./DownloadsView.css";

type Bi = { pl: string; en: string };
type DocItem = { id: string; title: Bi; type: string; size: string };

export default function DownloadsView() {
  const { info } = useToast();
  const { t, lang } = useT();
  const [subCategory, setSubCategory] = useState<string | null>(null);
  const pick = (b: Bi) => (lang === "en" ? b.en : b.pl);

  const scholarshipDocs: DocItem[] = [
    { id: "s1", title: { pl: "Regulamin świadczeń 2021", en: "Benefits Regulations 2021" }, type: "PDF", size: "1.2 MB" },
    { id: "s2", title: { pl: "Załącznik nr 1 - Wniosek o stypendium socjalne", en: "Annex 1 - Social Scholarship Application" }, type: "PDF", size: "0.8 MB" },
    { id: "s3", title: { pl: "Załącznik nr 2 - Zgoda na przetwarzanie danych", en: "Annex 2 - Consent to Data Processing" }, type: "PDF", size: "0.4 MB" },
    { id: "s4", title: { pl: "Załącznik nr 2a - Oświadczenie członka rodziny", en: "Annex 2a - Family Member Statement" }, type: "PDF", size: "0.5 MB" },
    { id: "s5", title: { pl: "Załącznik nr 3 - Wniosek o stypendium dla niepełnosprawnych", en: "Annex 3 - Scholarship Application for Disabled Students" }, type: "PDF", size: "0.5 MB" },
    { id: "s6", title: { pl: "Załącznik nr 4 - Wniosek o stypendium rektora", en: "Annex 4 - Rector's Scholarship Application" }, type: "PDF", size: "0.7 MB" },
    { id: "s7", title: { pl: "Załącznik nr 5 - Wniosek o zapomogę", en: "Annex 5 - Financial Aid Application" }, type: "PDF", size: "0.6 MB" },
    { id: "s8", title: { pl: "Załącznik nr 6 - Wybór kierunku do świadczeń", en: "Annex 6 - Choice of Field for Benefits" }, type: "PDF", size: "0.4 MB" },
    { id: "s9", title: { pl: "Załącznik nr 7 - Zasady oceny osiągnięć", en: "Annex 7 - Rules for Assessing Achievements" }, type: "PDF", size: "0.9 MB" },
  ];

  const internshipDocs: DocItem[] = [
    { id: "p1", title: { pl: "Program praktyk - Automatyka i Robotyka I st.", en: "Internship Program - Automation and Robotics, BSc" }, type: "PDF", size: "1.1 MB" },
    { id: "p2", title: { pl: "Program praktyk - Automatyka i Robotyka II st.", en: "Internship Program - Automation and Robotics, MSc" }, type: "PDF", size: "1.1 MB" },
    { id: "p3", title: { pl: "Program praktyk - Bioinformatyka I st.", en: "Internship Program - Bioinformatics, BSc" }, type: "PDF", size: "1.3 MB" },
    { id: "p4", title: { pl: "Program praktyk - Informatyka I st.", en: "Internship Program - Computer Science, BSc" }, type: "PDF", size: "1.0 MB" },
    { id: "p5", title: { pl: "Program praktyk - Informatyka II st.", en: "Internship Program - Computer Science, MSc" }, type: "PDF", size: "1.0 MB" },
  ];

  const applicationDocs: DocItem[] = [
    { id: "g1", title: { pl: "Deklaracja uczestnictwa w zajęciach", en: "Declaration of Class Participation" }, type: "PDF", size: "0.4 MB" },
    { id: "g2", title: { pl: "Warunki i różnice programowe", en: "Conditions and Curriculum Differences" }, type: "PDF", size: "0.5 MB" },
    { id: "g3", title: { pl: "Karta obiegowa PL-EN", en: "Clearance Form PL-EN" }, type: "PDF", size: "0.3 MB" },
    { id: "g4", title: { pl: "Zmiana danych kontaktowych", en: "Change of Contact Details" }, type: "PDF", size: "0.3 MB" },
    { id: "g5", title: { pl: "Podanie do Dziekana PL-EN", en: "Application to the Dean PL-EN" }, type: "PDF", size: "0.2 MB" },
    { id: "g6", title: { pl: "Podanie do Rektora PL-EN", en: "Application to the Rector PL-EN" }, type: "PDF", size: "0.2 MB" },
    { id: "g7", title: { pl: "Podanie do Reprezentanta Uczelni", en: "Application to the University Representative" }, type: "PDF", size: "0.2 MB" },
    { id: "g8", title: { pl: "Podanie o IOS (Indywidualna Organizacja)", en: "Application for ISO (Individual Study Organization)" }, type: "PDF", size: "0.4 MB" },
    { id: "g9", title: { pl: "Podanie o komisyjne zaliczenie", en: "Application for Committee Examination" }, type: "PDF", size: "0.3 MB" },
    { id: "g10", title: { pl: "Powrót z urlopu dziekańskiego", en: "Return from Dean's Leave" }, type: "PDF", size: "0.3 MB" },
    { id: "g11", title: { pl: "Przesunięcie terminu płatności", en: "Payment Deadline Extension" }, type: "PDF", size: "0.2 MB" },
    { id: "g12", title: { pl: "Rozłożenie płatności na raty", en: "Payment in Installments" }, type: "PDF", size: "0.2 MB" },
    { id: "g13", title: { pl: "Przedłużenie złożenia pracy dyplomowej", en: "Diploma Thesis Submission Extension" }, type: "PDF", size: "0.3 MB" },
    { id: "g14", title: { pl: "Przeniesienie na inną uczelnię", en: "Transfer to Another University" }, type: "PDF", size: "0.4 MB" },
    { id: "g15", title: { pl: "Podanie o powtarzanie semestru", en: "Application to Repeat a Semester" }, type: "PDF", size: "0.3 MB" },
    { id: "g16", title: { pl: "Podanie o wpis warunkowy", en: "Application for Conditional Registration" }, type: "PDF", size: "0.4 MB" },
    { id: "g17", title: { pl: "Skreślenie z listy studentów", en: "Removal from the Student List" }, type: "PDF", size: "0.2 MB" },
    { id: "g18", title: { pl: "Podanie o urlop dziekański", en: "Application for Dean's Leave" }, type: "PDF", size: "0.4 MB" },
    { id: "g19", title: { pl: "Podanie o zwrot nadpłaty", en: "Application for Overpayment Refund" }, type: "PDF", size: "0.2 MB" },
    { id: "g20", title: { pl: "Otrzymanie legitymacji elektronicznej", en: "Obtaining an Electronic Student ID" }, type: "PDF", size: "0.2 MB" },
    { id: "g21", title: { pl: "Podanie o zmianę formy płatności", en: "Application to Change Payment Method" }, type: "PDF", size: "0.2 MB" },
    { id: "g22", title: { pl: "Protokół wydania tematu pracy dyplomowej", en: "Diploma Thesis Topic Issuance Protocol" }, type: "PDF", size: "0.5 MB" },
    { id: "g23", title: { pl: "Wniosek o uznanie efektów kształcenia", en: "Application for Recognition of Learning Outcomes" }, type: "PDF", size: "0.6 MB" },
  ];

  const qualityDocs: DocItem[] = [
    { id: "q1", title: { pl: "Ankieta satysfakcji studenta", en: "Student Satisfaction Survey" }, type: "PDF", size: "0.2 MB" },
    { id: "q2", title: { pl: "Ankieta losów absolwentów", en: "Graduate Career Survey" }, type: "PDF", size: "0.3 MB" },
    { id: "q3", title: { pl: "Ankieta oceny nauczyciela", en: "Teacher Evaluation Survey" }, type: "PDF", size: "0.2 MB" },
    { id: "q4", title: { pl: "Procedura jakości kształcenia", en: "Education Quality Procedure" }, type: "PDF", size: "0.4 MB" },
    { id: "q5", title: { pl: "Procedura uznania efektów uczenia się", en: "Recognition of Learning Outcomes Procedure" }, type: "PDF", size: "0.5 MB" },
    { id: "q6", title: { pl: "Protokół hospitacji zajęć", en: "Class Observation Protocol" }, type: "PDF", size: "0.3 MB" },
    { id: "q7", title: { pl: "Regulamin Komisji Jakości Kształcenia", en: "Education Quality Committee Regulations" }, type: "PDF", size: "0.4 MB" },
    { id: "q8", title: { pl: "Regulamin oceny nauczycieli", en: "Teacher Evaluation Regulations" }, type: "PDF", size: "0.4 MB" },
  ];

  const CATS: Record<string, { docs: DocItem[]; card: Bi; title: Bi; icon: string; desc: Bi }> = {
    stypendia: {
      docs: scholarshipDocs, icon: "💰",
      card: { pl: "Stypendia", en: "Scholarships" },
      title: { pl: "Stypendia i Pomoc", en: "Scholarships & Aid" },
      desc: { pl: "Komplet dokumentów potrzebnych do ubiegania się o wsparcie finansowe.", en: "All documents needed to apply for financial support." },
    },
    praktyki: {
      docs: internshipDocs, icon: "💼",
      card: { pl: "Praktyki zawodowe", en: "Internships" },
      title: { pl: "Praktyki Zawodowe", en: "Professional Internships" },
      desc: { pl: "Programy praktyk zawodowych dla poszczególnych kierunków studiów.", en: "Internship programs for individual fields of study." },
    },
    podania: {
      docs: applicationDocs, icon: "📝",
      card: { pl: "Podania i oświadczenia", en: "Applications & Statements" },
      title: { pl: "Podania i oświadczenia", en: "Applications & Statements" },
      desc: { pl: "Wzory podań do Dziekana, Rektora oraz inne formularze urzędowe.", en: "Templates for applications to the Dean, Rector and other official forms." },
    },
    jakosc: {
      docs: qualityDocs, icon: "📈",
      card: { pl: "Jakość kształcenia", en: "Education Quality" },
      title: { pl: "Jakość Kształcenia", en: "Education Quality" },
      desc: { pl: "Regulaminy, procedury oraz ankiety dotyczące jakości nauczania.", en: "Regulations, procedures and surveys concerning teaching quality." },
    },
  };

  if (subCategory && CATS[subCategory]) {
    const cat = CATS[subCategory];
    return (
      <div className="dl-container">
        <div className="dl-header-back">
          <button className="dl-back-btn" onClick={() => setSubCategory(null)}>
            {t("downloads.back")}
          </button>
          <h3 className="dl-title">{pick(cat.title)} - {t("downloads.documents")}</h3>
        </div>

        <div className="scholarship-hero-card">
          <div className="scholarship-hero-content">
            <span className="scholarship-badge">{t("downloads.info")}</span>
            <h2>{pick(cat.title)}</h2>
            <p>{pick(cat.desc)}</p>
          </div>
          <div className="scholarship-hero-icon">{cat.icon}</div>
        </div>

        <div className="dl-grid">
          {cat.docs.map((doc) => (
            <div key={doc.id} className="dl-card">
              <div className="dl-card__icon-box">
                <span className="dl-card__icon">📄</span>
                <span className="dl-card__type">{doc.type}</span>
              </div>
              <div className="dl-card__info">
                <h4 className="dl-card__title">{pick(doc.title)}</h4>
                <div className="dl-card__meta">
                  <span>{doc.size}</span>
                </div>
              </div>
              <button className="dl-card__btn" onClick={() => info(lang === "en" ? `Downloading ${pick(doc.title)} — coming soon` : `Pobieranie ${pick(doc.title)} — wkrótce dostępne`)}>
                {t("downloads.download")}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="view-section-wrap">
      <SectionHeader
        title={t("downloads.title")}
        subtitle={t("downloads.subtitle")}
        emoji="📥"
      />

      <div className="category-grid">
        {Object.entries(CATS).map(([key, cat]) => (
          <div key={`cat-${key}`} className="category-card" onClick={() => setSubCategory(key)}>
            <div className="category-card__icon">{cat.icon}</div>
            <div className="category-card__text">
              <h4>{pick(cat.card)}</h4>
              <p>{cat.docs.length} {t("downloads.files")}</p>
            </div>
            <div className="category-card__arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}
