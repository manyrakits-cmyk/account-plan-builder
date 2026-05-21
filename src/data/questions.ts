import type { Question } from '../types'

export const QUESTIONS: Question[] = [
  // 1. Základní info
  {
    section: 'Základní info',
    sectionIndex: 1,
    key: 'client_name',
    q: 'Jak se jmenuje klient / account?',
  },
  {
    section: 'Základní info',
    sectionIndex: 1,
    key: 'owner',
    q: 'Kdo je account owner (ty, nebo někdo jiný)?',
  },

  // 2. Kontext klienta
  {
    section: 'Kontext klienta',
    sectionIndex: 2,
    key: 'industry',
    q: 'V jakém oboru klient podniká a co přibližně dělá? (Systém ti níže zobrazí co dohledal – můžeš to potvrdit nebo doplnit vlastními slovy.)',
  },
  {
    section: 'Kontext klienta',
    sectionIndex: 2,
    key: 'size',
    q: 'Jak velká firma je to – obrat, počet zaměstnanců, pobočky?',
  },

  // 3. Stav vztahu
  {
    section: 'Stav vztahu',
    sectionIndex: 3,
    key: 'relationship_overall',
    q: 'Jak bys popsal celkový stav vztahu s klientem? (pozitivní / neutrální / napjatý)',
  },
  {
    section: 'Stav vztahu',
    sectionIndex: 3,
    key: 'relationship_detail',
    q: 'Popiš vztah k jednotlivým klíčovým osobám – kdo je spojenec, kdo blocker? (nebo přeskoč)',
  },

  // 4. Stakeholdeři
  {
    section: 'Stakeholdeři',
    sectionIndex: 4,
    key: 'decision_makers',
    q: 'Kdo jsou klíčoví rozhodovači na straně klienta? Uveď jméno, pozici a jak se staví k Bootiqu.',
    hint:
      'Příklady:\n• Jan Novák – CEO, sponzor projektu, pozitivní\n• Marie Dvořák – CFO, blocker v dalším rozvoji, opatrná\n• Petr Svoboda – IT manažer, neutrální, přetížený operativou',
  },
  {
    section: 'Stakeholdeři',
    sectionIndex: 4,
    key: 'it_contacts',
    q: 'Je tam někdo na IT/technické straně, kdo přímo spolupracuje s tvým týmem?',
  },
  {
    section: 'Stakeholdeři',
    sectionIndex: 4,
    key: 'others',
    q: 'Jsou tam další důležití hráči – interní sponzoři, konzultanti, dodavatelé třetích stran? (nebo přeskoč)',
  },

  // 5. Governance & Budget
  {
    section: 'Governance & Budget',
    sectionIndex: 5,
    key: 'steering',
    q: 'Jak vypadá steering – kdo za klienta, kdo za Bootiq?',
    hint:
      'Příklad:\nKlient: Jan Havel (CEO – sponzor), Jiří Vojtíšek (CTO – senior user)\nBootiq: Michal Hacker (realizace), Filip Mejzlík (sales)',
  },
  {
    section: 'Governance & Budget',
    sectionIndex: 5,
    key: 'areas',
    q: 'Jaké oblasti spolupráce existují? Pro každou uveď koordinátora na straně klienta i Bootiqu.',
    hint:
      'Příklady oblastí:\n• Servisní projekt – klient: J. Vojtíšek / Bootiq: V. Myšák\n• Rozvoj webu – klient: J. Vojtíšek / Bootiq: J. Kalvoda\n• Business Intelligence – klient: D. Zhmako / Bootiq: J. Zajíc',
  },
  {
    section: 'Governance & Budget',
    sectionIndex: 5,
    key: 'budget_annual',
    q: 'Jaký je přibližný roční objem spolupráce? Máš číslo v Kč nebo alespoň odhad?',
  },
  {
    section: 'Governance & Budget',
    sectionIndex: 5,
    key: 'budget_breakdown',
    q: 'Jak je budget rozložený – rovnoměrně přes rok, nebo jsou špičky v určitých měsících?',
  },

  // 6. Rizika & Oportunity
  {
    section: 'Rizika & Oportunity',
    sectionIndex: 6,
    key: 'strategic_risks',
    q: 'Jaká jsou největší strategická rizika u tohoto accountu? Co by mohlo ohrozit spolupráci?',
    hint:
      'Příklady strategických rizik:\n• Závislost na jednom klíčovém kontaktu na straně klienta (bus factor)\n• Klient zvažuje insourcing části vývoje\n• Nespokojenost s rychlostí dodávky – riziko odchodu ke konkurenci\n• Nezaplacené faktury, platební morálka\n• Blokátor na úrovni CFO brzdí schválení nového budgetu',
  },
  {
    section: 'Rizika & Oportunity',
    sectionIndex: 6,
    key: 'opportunities',
    q: 'Vidíš nějaké zajímavé oportunity – nové oblasti spolupráce, rozšíření, upsell?',
    hint:
      'Příklady oportunit:\n• Klient zatím neřeší AI – otevřenost k pilotu\n• Expanze na nové trhy (SK, PL) – potřeba lokalizace\n• Zastaralá infrastruktura – příležitost pro infrastrukturní projekt\n• Nový CTO je otevřen modernizaci tech stacku\n• Klient nemá BI – příležitost pro datový projekt',
  },

  // 7. Cíle & Aktivity
  {
    section: 'Cíle & Aktivity',
    sectionIndex: 7,
    key: 'goals',
    q: 'Jaké jsou hlavní strategické cíle pro tento account v následujících 6–12 měsících?',
    hint:
      'Každý cíl by měl mít:\n• Jasný popis co chceme dosáhnout\n• Měřitelné kritérium úspěchu\n• Časový horizont\n\nPříklad: "Do Q3 2026 rozjet BI projekt – kritérium: podepsaná SoW a zahájený discovery."',
  },
  {
    section: 'Cíle & Aktivity',
    sectionIndex: 7,
    key: 'activities',
    q: 'Jaké konkrétní aktivity nebo kroky jsou teď rozjeté nebo plánované pro naplnění těch cílů?',
    hint:
      'Příklady aktivit:\n• Příprava nabídky na infrastrukturní audit – zodp. FM, termín: 15.6.\n• Steering meeting Q2 – zodp. MH, termín: 20.6.\n• Discovery workshop pro BI projekt – zodp. JZ, termín: 30.6.',
  },
  {
    section: 'Cíle & Aktivity',
    sectionIndex: 7,
    key: 'mgmt_needed',
    q: 'Poslední otázka: potřebuješ k něčemu zásah vedení Bootiqu? Pokud ne, napiš "ne".',
  },
]

export const TOTAL_SECTIONS = 7
