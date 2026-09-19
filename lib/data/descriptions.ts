// Element & muhurta popup content.
// Element scores (Tithi/Vara/Nakshatra/Yoga/Karana) and muhurta categories come
// from the user's Excel sheets. Color is binary: any "Inauspicious" category → red,
// everything else (Neutral / Moderate / Auspicious variants) → green.

export interface ElementInfo {
  description: string;
  isAuspicious: boolean;
  reason: string;
  idealFor: string;
}

/** Muhurta timing info (from the Excel sheet) — no scores. */
export interface MuhurtaInfo {
  name: string;
  auspiciousness: string;  // traditional classification (badge text)
  reason: string;          // commercial significance
  isAuspicious: boolean;
  nature: string;
  bonus?: number;          // auspicious muhurtas only
  penalty?: number;        // inauspicious multiplier (default 0); e.g. 0.9 for Baana/Vidal Yoga
}

const isAusp = (category: string): boolean => !/inauspicious/i.test(category);

// MU(name, traditional classification, nature, commercial significance, bonus?).
// `auspiciousness` holds the verbatim classification (badge text); `reason` holds the
// significance — both kept for the Non-Overlapping section's PopupContent.
const MU = (name: string, classification: string, nature: string, significance: string, bonus?: number, penalty?: number): MuhurtaInfo =>
  ({ name, auspiciousness: classification, reason: significance, nature, bonus, penalty, isAuspicious: isAusp(classification) });

// ── Rich scored-element model (Tithi/Vara/Nakshatra/Yoga/Karana) ──────────
// Each element carries five scored categories (classification word + 0–100 score),
// a "Nature", an optional "tag" shown after the name (Tithi → Group, Vara/Nakshatra
// → Planetary Lord, Karana → Type, Yoga → none), and a Commercial Significance
// sentence. Back-compat aliases (businessScore/isAuspicious/idealFor) keep existing
// consumers — businessMuhurta ranking math and RankingTime — working.
export interface TithiCat { classification: string; score: number; }
export interface ScoredElement {
  tag?: string;            // shown as "(tag)" after the name; omitted/empty for Yoga
  nature: string;
  significance: string;
  general: TithiCat;
  bid: TithiCat;
  contract: TithiCat;
  newVentures: TithiCat;
  financial: TithiCat;
  isAuspicious: boolean;   // derived: Poor/Prohibited → false, else true
  businessScore: number;   // ranking input — placeholder = general.score (confirm later)
  idealFor: string;        // = significance (used by RankingTime)
}
/** Back-compat alias for the original Tithi-only name. */
export type TithiScore = ScoredElement;

const tc = (classification: string, score: number): TithiCat => ({ classification, score });
const tAusp = (c: string): boolean => !/^(poor|prohibited)$/i.test(c.trim());
const S = (
  tag: string, nature: string, significance: string,
  general: TithiCat, bid: TithiCat, contract: TithiCat, newVentures: TithiCat, financial: TithiCat,
): ScoredElement => ({
  tag, nature, significance, general, bid, contract, newVentures, financial,
  isAuspicious: tAusp(general.classification),
  businessScore: general.score, // <-- one-line change once the ranking score is chosen
  idealFor: significance,
});
// `T` kept as an alias so the existing TITHIS table (tag = Group) needs no rewrite.
const T = S;

export const ELEMENT_TYPES: Record<string, { label: string; description: string; brief: string }> = {
  tithi: {
    label: 'Tithi (Lunar Day)',
    description: 'Tithi is the lunar day — one of the five essential Panchang limbs.',
    brief: 'Determines auspiciousness for ceremonies and activities',
  },
  nakshatra: {
    label: 'Nakshatra (Lunar Mansion)',
    description: 'Nakshatra is the lunar mansion occupied by the Moon.',
    brief: 'Influences the quality and outcome of events',
  },
  yoga: {
    label: 'Yoga (Sun-Moon Combination)',
    description: 'Yoga is the Sun-Moon longitudinal combination, indicating day quality.',
    brief: 'Affects the overall quality of the day',
  },
  karana: {
    label: 'Karana (Half-Day Period)',
    description: 'Karana is half a Tithi — each lunar day is split into two Karanas.',
    brief: 'Shapes success of activities begun within it',
  },
  vara: {
    label: 'Vara (Weekday)',
    description: 'Vara is the weekday, each ruled by a planet imparting specific qualities.',
    brief: 'Influences all activities of the day',
  },
  paksha: {
    label: 'Paksha (Lunar Fortnight)',
    description: 'Paksha is the lunar fortnight — Shukla (waxing) or Krishna (waning).',
    brief: 'Waxing favors beginnings, waning favors completion',
  },
};

// Keyed by "<Paksha> <Name>" (the sheet distinguishes Shukla vs Krishna);
// Purnima / Amavasya have no paksha prefix.
// T(group, nature, significance, general, bid, contract, newVentures, financial)
export const TITHIS: Record<string, TithiScore> = {
  'Shukla Pratipada':    T('Nanda',  'Beginning',    'Stronger for initiating new ventures and exploratory efforts than for binding commitments.',                            tc('Good', 68),      tc('Average', 64),    tc('Good', 68),      tc('Very Good', 80), tc('Average', 64)),
  'Shukla Dwitiya':      T('Bhadra', 'Cooperation',  'Excellent for partnerships, cooperation, agreements, banking, and relationship-based business activities.',              tc('Very Good', 89), tc('Excellent', 94),  tc('Excellent', 97), tc('Very Good', 88), tc('Excellent', 99)),
  'Shukla Tritiya':      T('Jaya',   'Victory',      'Strongly supports victory, expansion, investments, acquisitions, and successful pursuit of opportunities.',              tc('Excellent', 95), tc('Excellent', 99),  tc('Excellent', 91), tc('Excellent', 99), tc('Excellent', 96)),
  'Shukla Chaturthi':    T('Rikta',  'Obstruction',  'Traditionally avoided due to obstacles, delays, disputes, and procedural complications.',                                tc('Poor', 45),      tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0), tc('Prohibited', 0)),
  'Shukla Panchami':     T('Purna',  'Prosperity',   'Excellent for trade, prosperity, commercial transactions, acquisitions, and contract fulfillment.',                      tc('Excellent', 94), tc('Excellent', 92),  tc('Excellent', 98), tc('Excellent', 96), tc('Excellent', 95)),
  'Shukla Shashthi':     T('Nanda',  'Achievement',  'Suitable for organized business efforts, administration, planning, and structured execution.',                           tc('Very Good', 84), tc('Very Good', 84),  tc('Very Good', 86), tc('Very Good', 87), tc('Very Good', 84)),
  'Shukla Saptami':      T('Bhadra', 'Progress',     'Supports recognition, visibility, institutional support, commercial growth, and financial activities.',                  tc('Excellent', 91), tc('Excellent', 96),  tc('Excellent', 95), tc('Excellent', 90), tc('Excellent', 99)),
  'Shukla Ashtami':      T('Jaya',   'Conflict',     'Competitive energy exists but often introduces instability, making major agreements and financial decisions difficult.', tc('Poor', 45),      tc('Poor', 45),       tc('Poor', 40),      tc('Poor', 45),      tc('Poor', 40)),
  'Shukla Navami':       T('Rikta',  'Aggression',   'Aggressive influences undermine cooperation, stability, and commercial harmony.',                                         tc('Poor', 40),      tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0), tc('Prohibited', 0)),
  'Shukla Dashami':      T('Purna',  'Success',      'Exceptional for successful execution, project awards, authority, realization, and fulfillment of commercial objectives.',           tc('Excellent', 97), tc('Excellent', 96),  tc('Excellent', 100),tc('Excellent', 97), tc('Excellent', 97)),
  'Shukla Ekadashi':     T('Nanda',  'Discipline',   'Better for planning, review, discipline, and strategic evaluation than aggressive commercial activity.',                  tc('Good', 78),      tc('Good', 72),       tc('Good', 74),      tc('Good', 70),      tc('Good', 72)),
  'Shukla Dwadashi':     T('Bhadra', 'Stability',    'Exceptional for agreements, institutional dealings, banking, financial activities, and long-term stability.',             tc('Excellent', 90), tc('Excellent', 95),  tc('Excellent', 98), tc('Very Good', 89),tc('Excellent', 100)),
  'Shukla Trayodashi':   T('Jaya',   'Expansion',    'Premier tithi for winning opportunities, expansion, commercial growth, wealth generation, and financial prosperity.',    tc('Excellent', 96), tc('Excellent', 100), tc('Excellent', 92), tc('Excellent', 100),tc('Excellent', 97)),
  'Shukla Chaturdashi':  T('Rikta',  'Dissolution',  'Dissolution-oriented influences make commitments, contracts, and financial activities unfavorable.',                     tc('Poor', 35),      tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0), tc('Prohibited', 0)),
  Purnima:               T('Purna',  'Fulfillment',  'Best suited for fulfillment, settlements, completion, realization, and closing successful negotiations.',                tc('Very Good', 84), tc('Very Good', 86),  tc('Excellent', 90), tc('Good', 78),      tc('Very Good', 88)),
  'Krishna Pratipada':   T('Nanda',  'Beginning',    'Useful for restructuring, reviews, continuation, and consolidation of existing activities.',                             tc('Good', 65),      tc('Average', 60),    tc('Average', 62),   tc('Average', 58),   tc('Average', 60)),
  'Krishna Dwitiya':     T('Bhadra', 'Cooperation',  'Supports partnerships, continuity, cooperation, and stable financial dealings.',                                         tc('Very Good', 84), tc('Excellent', 90),  tc('Very Good', 92), tc('Very Good', 85), tc('Excellent', 95)),
  'Krishna Tritiya':     T('Jaya',   'Victory',      'Favors competitive advantage, growth initiatives, investments, and business advancement.',                               tc('Excellent', 90), tc('Excellent', 95),  tc('Very Good', 88), tc('Excellent', 94), tc('Excellent', 92)),
  'Krishna Chaturthi':   T('Rikta',  'Obstruction',  'High potential for interruptions, revisions, disputes, and execution challenges.',                                       tc('Poor', 42),      tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0), tc('Prohibited', 0)),
  'Krishna Panchami':    T('Purna',  'Prosperity',   'Supports trade, wealth generation, profitable transactions, and business development.',                                  tc('Very Good', 88), tc('Very Good', 89),  tc('Excellent', 95), tc('Excellent', 92), tc('Excellent', 92)),
  'Krishna Shashthi':    T('Nanda',  'Achievement',  'Good for administration, operational management, compliance, and internal business matters.',                            tc('Very Good', 81), tc('Very Good', 80),  tc('Very Good', 82), tc('Very Good', 82), tc('Very Good', 80)),
  'Krishna Saptami':     T('Bhadra', 'Progress',     'Favorable for institutional growth, business development, partnerships, and financial activities.',                       tc('Very Good', 87), tc('Excellent', 92),  tc('Very Good', 92), tc('Very Good', 87), tc('Excellent', 97)),
  'Krishna Ashtami':     T('Jaya',   'Conflict',     'Intense and unpredictable influences may complicate negotiations, agreements, and commercial outcomes.',                 tc('Poor', 40),      tc('Poor', 40),       tc('Poor', 35),      tc('Poor', 40),      tc('Poor', 35)),
  'Krishna Navami':      T('Rikta',  'Aggression',   'Conflict-prone influences can obstruct commercial success and cooperation.',                                             tc('Poor', 35),      tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0), tc('Prohibited', 0)),
  'Krishna Dashami':     T('Purna',  'Success',      'Strong for execution, commitments, realization of goals, and successful completion of business matters.',               tc('Excellent', 93), tc('Excellent', 92),  tc('Excellent', 97), tc('Excellent', 93), tc('Excellent', 94)),
  'Krishna Ekadashi':    T('Nanda',  'Discipline',   'Suitable for reflection, strategy, review, and internal financial assessment.',                                          tc('Good', 74),      tc('Good', 68),       tc('Good', 70),      tc('Good', 65),      tc('Good', 68)),
  'Krishna Dwadashi':    T('Bhadra', 'Stability',    'Strong for financial dealings, stable agreements, institutional support, and wealth preservation.',                      tc('Very Good', 86), tc('Excellent', 91),  tc('Excellent', 95), tc('Very Good', 86), tc('Excellent', 98)),
  'Krishna Trayodashi':  T('Jaya',   'Expansion',    'Supports expansion, commercial success, negotiations, and financial prosperity.',                                        tc('Excellent', 90), tc('Excellent', 96),  tc('Very Good', 89), tc('Excellent', 95), tc('Excellent', 93)),
  'Krishna Chaturdashi': T('Rikta',  'Dissolution',  'Traditionally unsuitable for commitments, agreements, finance, and long-term undertakings.',                             tc('Poor', 25),      tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0), tc('Prohibited', 0)),
  Amavasya:              T('Purna',  'Closure',      'Traditionally avoided for major commercial, contractual, financial, and business undertakings.',                         tc('Poor', 10),      tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0), tc('Prohibited', 0)),
};

// tag = Planetary Lord. S(tag, nature, significance, general, bid, contract, newVentures, financial)
export const NAKSHATRAS: Record<string, ScoredElement> = {
  Ashwini:            S('Ketu',                'Initiation',     'Excellent for launching ventures, rapid progress, entrepreneurship, and new initiatives.', tc('Excellent', 92), tc('Very Good', 88),  tc('Good', 78),      tc('Excellent', 98), tc('Very Good', 86)),
  Bharani:            S('Venus (Shukra)',      'Restraint',      'Strong willpower but carries restrictive and transformative energies.',                     tc('Average', 74),   tc('Average', 60),    tc('Average', 58),   tc('Average', 62),   tc('Average', 60)),
  Krittika:           S('Sun (Surya)',         'Determination',  'Supports decisive action and leadership but may be overly sharp for partnerships.',         tc('Good', 75),      tc('Good', 80),       tc('Good', 72),      tc('Good', 75),      tc('Good', 70)),
  Rohini:             S('Moon (Chandra)',      'Prosperity',     'One of the finest Nakshatras for prosperity, growth, commerce, finance, and business expansion.', tc('Excellent', 100), tc('Excellent', 96), tc('Excellent', 98), tc('Excellent', 100), tc('Excellent', 100)),
  Mrigashira:         S('Mars (Mangala)',      'Growth',         'Supports exploration, networking, business development, and opportunity seeking.',          tc('Excellent', 90), tc('Excellent', 94),  tc('Very Good', 86), tc('Excellent', 95), tc('Excellent', 90)),
  Ardra:              S('Rahu',                'Disruption',     'Traditionally avoided for stable commercial activities due to disruptive influences.',       tc('Poor', 35),      tc('Poor', 40),       tc('Poor', 25),      tc('Poor', 30),      tc('Poor', 25)),
  Punarvasu:          S('Jupiter (Brihaspati)','Renewal',        'Excellent for renewal, expansion, stability, and sustainable business growth.',             tc('Excellent', 94), tc('Very Good', 88),  tc('Excellent', 94), tc('Excellent', 96), tc('Excellent', 94)),
  Pushya:             S('Saturn (Shani)',      'Nourishment',    'Universally praised for prosperity, stability, contracts, institutions, and wealth.',       tc('Excellent', 100),tc('Excellent', 95),  tc('Excellent', 100),tc('Excellent', 98), tc('Excellent', 100)),
  Ashlesha:           S('Mercury (Budha)',     'Strategy',       'Suitable for strategic work but not ideal for transparent commercial dealings.',            tc('Average', 65),   tc('Average', 55),    tc('Poor', 45),      tc('Average', 55),   tc('Average', 58)),
  Magha:              S('Ketu',                'Authority',      'Supports authority, leadership, prestige, and institutional influence.',                    tc('Very Good', 88), tc('Very Good', 90),  tc('Very Good', 88), tc('Very Good', 86), tc('Good', 80)),
  'Purva Phalguni':   S('Venus (Shukra)',      'Enjoyment',      'Good for growth, prosperity, branding, and commercial expansion.',                          tc('Very Good', 86), tc('Good', 82),       tc('Very Good', 86), tc('Excellent', 92), tc('Very Good', 88)),
  'Uttara Phalguni':  S('Sun (Surya)',         'Agreements',     'One of the best Nakshatras for agreements, contracts, partnerships, and long-term success.', tc('Excellent', 98), tc('Excellent', 96),  tc('Excellent', 100),tc('Excellent', 97), tc('Excellent', 98)),
  Hasta:              S('Moon (Chandra)',      'Skill',          'Strong for transactions, commerce, documentation, and business execution.',                 tc('Excellent', 96), tc('Excellent', 95),  tc('Excellent', 97), tc('Excellent', 95), tc('Excellent', 98)),
  Chitra:             S('Mars (Mangala)',      'Creation',       'Supports creation, enterprise, competitiveness, and business development.',                  tc('Very Good', 87), tc('Excellent', 92),  tc('Very Good', 84), tc('Excellent', 90), tc('Very Good', 85)),
  Swati:              S('Rahu',                'Trade',          'Excellent for trade, negotiations, independence, commerce, and market expansion.',          tc('Excellent', 95), tc('Excellent', 98),  tc('Excellent', 94), tc('Excellent', 96), tc('Excellent', 97)),
  Vishakha:           S('Jupiter (Brihaspati)','Achievement',    'Strongly goal-oriented and favorable for achievement, growth, and expansion.',              tc('Excellent', 94), tc('Excellent', 97),  tc('Excellent', 92), tc('Excellent', 95), tc('Excellent', 94)),
  Anuradha:           S('Saturn (Shani)',      'Cooperation',    'Outstanding for partnerships, alliances, contracts, networking, and long-term growth.',     tc('Excellent', 98), tc('Excellent', 95),  tc('Excellent', 98), tc('Excellent', 95), tc('Excellent', 97)),
  Jyeshtha:           S('Mercury (Budha)',     'Authority',      'Supports leadership and control but may introduce power dynamics.',                         tc('Good', 72),      tc('Good', 75),       tc('Good', 70),      tc('Good', 68),      tc('Good', 72)),
  Mula:               S('Ketu',                'Uprooting',      'Traditionally avoided for commercial stability, wealth, and long-term undertakings.',       tc('Poor', 20),      tc('Poor', 15),       tc('Poor', 20),      tc('Poor', 10),      tc('Poor', 15)),
  'Purva Ashadha':    S('Venus (Shukra)',      'Expansion',      'Supports growth, promotion, expansion, and commercial visibility.',                         tc('Good', 82),      tc('Very Good', 88),  tc('Good', 78),      tc('Very Good', 85), tc('Good', 80)),
  'Uttara Ashadha':   S('Sun (Surya)',         'Victory',        'Excellent for enduring success, institutions, contracts, and long-term ventures.',          tc('Excellent', 97), tc('Excellent', 95),  tc('Excellent', 99), tc('Excellent', 96), tc('Excellent', 98)),
  Shravana:           S('Moon (Chandra)',      'Learning',       'Excellent for learning, communication, institutional growth, and finance.',                 tc('Excellent', 96), tc('Excellent', 92),  tc('Excellent', 97), tc('Excellent', 94), tc('Excellent', 99)),
  Dhanishtha:         S('Mars (Mangala)',      'Wealth',         'Strong for wealth generation, growth, achievement, and commercial success.',                tc('Excellent', 94), tc('Excellent', 96),  tc('Excellent', 92), tc('Excellent', 95), tc('Excellent', 96)),
  Shatabhisha:        S('Rahu',                'Isolation',      'Better for research and specialized activities than mainstream commercial work.',           tc('Average', 60),   tc('Average', 62),    tc('Average', 55),   tc('Average', 58),   tc('Average', 60)),
  'Purva Bhadrapada': S('Jupiter (Brihaspati)','Transformation', 'Intense and transformative, less suited for stable business activities.',                   tc('Average', 55),   tc('Average', 50),    tc('Poor', 40),      tc('Average', 55),   tc('Poor', 45)),
  'Uttara Bhadrapada':S('Saturn (Shani)',      'Stability',      'Excellent for stability, wealth preservation, long-term agreements, and endurance.',        tc('Excellent', 92), tc('Very Good', 88),  tc('Excellent', 96), tc('Very Good', 86), tc('Excellent', 95)),
  Revati:             S('Mercury (Budha)',     'Completion',     'One of the finest Nakshatras for prosperity, successful ventures, commerce, travel, and finance.', tc('Excellent', 99), tc('Excellent', 95), tc('Excellent', 98), tc('Excellent', 100),tc('Excellent', 99)),
};

// Yoga has no tag (Nature only). Some yogas have spelling variants the calculator
// may emit — both keys point to the same data (Sukarman/Sukarma, Shula/Shoola,
// Variyan/Variyana, Mahendra/Indra).
const yoga_sukarman = S('', 'Achievement', 'One of the finest Yogas for achievement, success, business, and commercial efforts.', tc('Excellent', 98), tc('Excellent', 96), tc('Excellent', 98), tc('Excellent', 97), tc('Excellent', 97));
const yoga_shula    = S('', 'Conflict',    'Aggressive and confrontational influences may hinder cooperation.',                    tc('Poor', 35),      tc('Average', 50),   tc('Poor', 25),      tc('Poor', 30),      tc('Poor', 25));
const yoga_variyan  = S('', 'Comfort',     'Supports comfort, continuity, and moderate success.',                                  tc('Good', 74),      tc('Good', 75),      tc('Good', 82),      tc('Good', 80),      tc('Good', 80));
const yoga_mahendra = S('', 'Leadership',  'Supports leadership, authority, expansion, and material success.',                     tc('Excellent', 97), tc('Excellent', 95), tc('Excellent', 97), tc('Excellent', 98), tc('Excellent', 97));
export const YOGAS: Record<string, ScoredElement> = {
  Dhruva:     S('', 'Permanence',     'One of the most stable and enduring Yogas for contracts, institutions, and finance.', tc('Excellent', 100), tc('Excellent', 96), tc('Excellent', 100), tc('Excellent', 98), tc('Excellent', 100)),
  Siddhi:     S('', 'Accomplishment', 'One of the best Yogas for success, accomplishment, contracts, and prosperity.',       tc('Excellent', 100), tc('Excellent', 98), tc('Excellent', 100), tc('Excellent', 99), tc('Excellent', 99)),
  Vriddhi:    S('', 'Expansion',      'Outstanding for growth, expansion, wealth creation, and business development.',        tc('Excellent', 99),  tc('Excellent', 97), tc('Excellent', 98),  tc('Excellent', 100), tc('Excellent', 99)),
  Siddha:     S('', 'Success',        'Traditionally regarded as highly favorable for successful undertakings.',             tc('Excellent', 99),  tc('Excellent', 97), tc('Excellent', 99),  tc('Excellent', 98), tc('Excellent', 99)),
  Sukarman:   yoga_sukarman,
  Sukarma:    yoga_sukarman,
  Shiva:      S('', 'Auspiciousness', 'Highly auspicious for stability, prosperity, and long-term success.',                  tc('Excellent', 98),  tc('Excellent', 94), tc('Excellent', 99),  tc('Excellent', 96), tc('Excellent', 98)),
  Shubha:     S('', 'Auspiciousness', 'Universally auspicious and favorable for most business activities.',                   tc('Excellent', 97),  tc('Excellent', 94), tc('Excellent', 97),  tc('Excellent', 96), tc('Excellent', 97)),
  Mahendra:   yoga_mahendra,
  Indra:      yoga_mahendra,
  Saubhagya:  S('', 'Fortune',        'Excellent for prosperity, growth, wealth, and favorable outcomes.',                   tc('Excellent', 96),  tc('Excellent', 92), tc('Excellent', 96),  tc('Excellent', 98), tc('Excellent', 96)),
  Shukla:     S('', 'Purity',         'Promotes clarity, growth, prosperity, and positive outcomes.',                        tc('Excellent', 96),  tc('Excellent', 93), tc('Excellent', 96),  tc('Excellent', 97), tc('Excellent', 96)),
  Dhriti:     S('', 'Stability',      'Excellent for stability, perseverance, and long-term business success.',              tc('Excellent', 95),  tc('Excellent', 92), tc('Excellent', 97),  tc('Excellent', 94), tc('Excellent', 96)),
  Brahma:     S('', 'Creation',       'Excellent for planning, institutions, knowledge-based ventures, and stability.',      tc('Excellent', 95),  tc('Very Good', 88), tc('Excellent', 96),  tc('Excellent', 95), tc('Excellent', 96)),
  Priti:      S('', 'Harmony',        'Excellent for partnerships, agreements, client relations, and commercial harmony.',   tc('Excellent', 94),  tc('Very Good', 88), tc('Excellent', 95),  tc('Excellent', 94), tc('Excellent', 95)),
  Shobhana:   S('', 'Prosperity',     'Promotes attractiveness, goodwill, growth, and successful ventures.',                 tc('Excellent', 94),  tc('Very Good', 88), tc('Excellent', 95),  tc('Excellent', 96), tc('Excellent', 94)),
  Sadhya:     S('', 'Attainment',     'Supports achievement of goals, agreements, and commercial progress.',                 tc('Excellent', 94),  tc('Excellent', 92), tc('Excellent', 95),  tc('Excellent', 94), tc('Excellent', 94)),
  Ayushman:   S('', 'Longevity',      'Supports longevity, sustainability, and enduring business success.',                  tc('Excellent', 92),  tc('Very Good', 86), tc('Excellent', 94),  tc('Excellent', 92), tc('Excellent', 93)),
  Harshana:   S('', 'Joy',            'Promotes success, enthusiasm, confidence, and favorable outcomes.',                   tc('Excellent', 92),  tc('Very Good', 88), tc('Excellent', 92),  tc('Excellent', 94), tc('Excellent', 92)),
  Vishkambha: S('', 'Stability',      'Supports stability, overcoming obstacles, and sustained effort.',                     tc('Good', 85),       tc('Good', 80),      tc('Good', 78),       tc('Good', 75),      tc('Good', 76)),
  Variyan:    yoga_variyan,
  Variyana:   yoga_variyan,
  Vajra:      S('', 'Power',          'Strong but harsh; useful in competitive situations but weak for cooperation.',        tc('Average', 55),    tc('Good', 70),      tc('Poor', 45),       tc('Average', 55),   tc('Average', 50)),
  Shula:      yoga_shula,
  Shoola:     yoga_shula,
  Atiganda:   S('', 'Obstruction',    'Traditionally associated with obstacles, disruptions, and instability.',              tc('Poor', 30),       tc('Poor', 25),      tc('Poor', 20),       tc('Poor', 25),      tc('Poor', 20)),
  Ganda:      S('', 'Disruption',     'Associated with complications, disputes, and interruptions.',                         tc('Poor', 25),       tc('Poor', 20),      tc('Poor', 15),       tc('Poor', 20),      tc('Poor', 15)),
  Vyaghata:   S('', 'Harm',           'Traditionally unfavorable due to destructive and disruptive influences.',             tc('Poor', 20),       tc('Poor', 15),      tc('Poor', 10),       tc('Poor', 15),      tc('Poor', 10)),
  Parigha:    S('', 'Barrier',        'Associated with barriers, obstructions, and failure of efforts.',                     tc('Poor', 20),       tc('Poor', 15),      tc('Poor', 10),       tc('Poor', 15),      tc('Poor', 10)),
  Vyatipata:  S('', 'Catastrophe',    'Traditionally rejected in Muhurta due to severe instability and unpredictability.',   tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0)),
  Vaidhriti:  S('', 'Separation',     'Traditionally rejected in Muhurta due to divisive and adverse influences.',           tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0),  tc('Prohibited', 0), tc('Prohibited', 0)),
};

// tag = Type (Movable / Fixed). Gara/Garija/Garaja and Taitila/Taitula are spelling
// variants the karana calculator may emit — each points to the same data.
const karana_gara    = S('Movable', 'Stability',     'Good for practical execution, administration, and steady commercial activity.', tc('Very Good', 86), tc('Very Good', 84), tc('Very Good', 88), tc('Very Good', 86), tc('Very Good', 86));
const karana_taitila = S('Movable', 'Organization',  'Supports planning, organization, commercial growth, and structured success.',   tc('Excellent', 95), tc('Excellent', 94), tc('Excellent', 95), tc('Excellent', 96), tc('Excellent', 95));
export const KARANAS: Record<string, ScoredElement> = {
  Bava:        S('Movable', 'Growth',       'Supports growth, development, expansion, and successful undertakings.',                       tc('Excellent', 92), tc('Excellent', 90), tc('Excellent', 92), tc('Excellent', 95), tc('Excellent', 90)),
  Balava:      S('Movable', 'Strength',     'Good for strengthening foundations, development, and sustained progress.',                    tc('Excellent', 90), tc('Very Good', 88), tc('Excellent', 90), tc('Excellent', 94), tc('Very Good', 88)),
  Kaulava:     S('Movable', 'Cooperation',  'Excellent for partnerships, alliances, agreements, and cooperative ventures.',                tc('Excellent', 94), tc('Excellent', 92), tc('Excellent', 95), tc('Excellent', 93), tc('Excellent', 94)),
  Taitila:     karana_taitila,
  Taitula:     karana_taitila,
  Gara:        karana_gara,
  Garija:      karana_gara,
  Garaja:      karana_gara,
  Vanija:      S('Movable', 'Commerce',     'The premier Karana for trade, contracts, negotiations, and financial activities.',            tc('Excellent', 100),tc('Excellent', 100),tc('Excellent', 98), tc('Excellent', 97), tc('Excellent', 100)),
  Vishti:      S('Movable', 'Obstruction',  'Traditionally rejected for auspicious, commercial, contractual, and financial undertakings.', tc('Prohibited', 0), tc('Prohibited', 0), tc('Prohibited', 0), tc('Prohibited', 0), tc('Prohibited', 0)),
  Shakuni:     S('Fixed',   'Strategy',     'Better suited for strategy and planning than for successful commercial execution.',           tc('Poor', 30),      tc('Poor', 35),      tc('Poor', 25),      tc('Poor', 30),      tc('Poor', 25)),
  Chatushpada: S('Fixed',   'Instinct',     'Traditionally associated with non-commercial and ritual activities rather than business.',     tc('Poor', 20),      tc('Poor', 15),      tc('Poor', 10),      tc('Poor', 15),      tc('Poor', 10)),
  Naga:        S('Fixed',   'Conflict',     'Traditionally avoided for contracts, finance, and major undertakings.',                       tc('Poor', 10),      tc('Poor', 5),       tc('Prohibited', 0), tc('Poor', 5),       tc('Prohibited', 0)),
  Kimstughna:  S('Fixed',   'Renewal',      'Useful for clearing obstacles, endings, transitions, and initiating fresh cycles.',           tc('Good', 75),      tc('Good', 70),      tc('Good', 75),      tc('Very Good', 74), tc('Good', 72)),
};

// tag = Planetary Lord. Keyed by Sanskrit name (vara.name) AND English weekday
// (used by businessMuhurta's VARA_NAMES lookup) — both point to the same object.
const vara_ravi   = S('Surya',      'Authority & Leadership',        'Favors authority, government dealings, executive decisions, leadership initiatives, and institutional recognition.',          tc('Very Good', 85), tc('Very Good', 88), tc('Very Good', 86), tc('Very Good', 87), tc('Good', 80));
const vara_soma   = S('Chandra',    'Relationships & Adaptability',  'Supports relationships, negotiations, client interactions, adaptability, and cooperative ventures.',                          tc('Good', 78),      tc('Good', 75),      tc('Good', 78),      tc('Good', 80),      tc('Good', 78));
const vara_mangala= S('Mangala',    'Aggression & Competition',      'Strong for competitive situations, tenders, disputes, and overcoming rivals, but less favorable for agreements and finance.', tc('Average', 68),   tc('Excellent', 92), tc('Poor', 45),      tc('Average', 60),   tc('Poor', 50));
const vara_budha  = S('Budha',      'Commerce & Communication',      'Premier weekday for commerce, contracts, negotiations, trade, communication, business launches, and financial activities.',   tc('Excellent', 95), tc('Excellent', 97), tc('Excellent', 95), tc('Excellent', 96), tc('Excellent', 100));
const vara_guru   = S('Brihaspati', 'Wisdom & Expansion',            'Excellent for expansion, institutional growth, finance, investments, partnerships, and long-term success.',                   tc('Excellent', 96), tc('Excellent', 94), tc('Excellent', 98), tc('Excellent', 97), tc('Excellent', 99));
const vara_shukra = S('Shukra',     'Prosperity & Harmony',          'Supports prosperity, wealth generation, commercial growth, harmonious agreements, and financial success.',                    tc('Excellent', 94), tc('Very Good', 89), tc('Excellent', 95), tc('Excellent', 96), tc('Excellent', 98));
const vara_shani  = S('Shani',      'Discipline & Endurance',        'Favors long-term commitments, disciplined execution, infrastructure, compliance, and sustained financial activities.',         tc('Good', 79),      tc('Good', 70),      tc('Very Good', 85), tc('Good', 68),      tc('Very Good', 88));
export const VARAS: Record<string, ScoredElement> = {
  Ravivara: vara_ravi,       Sunday: vara_ravi,
  Somavara: vara_soma,       Monday: vara_soma,
  Mangalavara: vara_mangala, Tuesday: vara_mangala,
  Budhavara: vara_budha,     Wednesday: vara_budha,
  Guruvara: vara_guru,       Thursday: vara_guru,
  Shukravara: vara_shukra,   Friday: vara_shukra,
  Shanivara: vara_shani,     Saturday: vara_shani,
};

export const PAKSHAS: Record<string, ElementInfo> = {
  Shukla:  { description: 'Shukla Paksha — waxing Moon, New Moon to Full Moon.', isAuspicious: true,  reason: 'Waxing Moon — favors new beginnings.', idealFor: 'New ventures, ceremonies, positive activities' },
  Krishna: { description: 'Krishna Paksha — waning Moon, Full Moon to New Moon.', isAuspicious: false, reason: 'Waning Moon — favors completion and introspection.', idealFor: 'Completing tasks, introspection, ancestor worship' },
};

// Muhurta timings. MU(name, traditional classification, nature, significance, bonus?).
// Order is the display order.
export const MUHURTA_INFO: Record<string, MuhurtaInfo> = {
  // Auspicious (carry a Bonus)
  abhijitMuhurta:   MU('Abhijit Muhurta',   'Highly Auspicious', 'Victory & Success', 'Universally auspicious. Ideal for launches, contracts, registrations, banking, investments, negotiations, and executive decisions.', 10),
  vijayaMuhurta:    MU('Vijaya Muhurta',    'Highly Auspicious', 'Victory',           'Excellent for tenders, competitive bids, legal matters, negotiations, dispute resolution, and overcoming competition.', 8),
  amritKalam:       MU('Amrit Kalam',       'Highly Auspicious', 'Prosperity',        'Favors prosperity, wealth creation, investments, commercial growth, and financial activities.', 7),
  brahmaMuhurta:    MU('Brahma Muhurta',    'Auspicious',        'Knowledge',         'Excellent for planning, strategy, forecasting, learning, contemplation, and decision preparation. Not ideal for commercial execution.', 3),
  godhuliMuhurta:   MU('Godhuli Muhurta',   'Auspicious',        'Transition',        'Moderately favorable for relationship-oriented activities and routine undertakings.', 2),
  nishitaMuhurta:   MU('Nishita Muhurta',   'Neutral',           'Mystical',          'Primarily spiritual and tantric. Limited business relevance.', 0),
  pratahSandhya:    MU('Pratah Sandhya',    'Neutral',           'Purification',      'Suitable for prayer and preparation, not commercial execution.', 0),
  madhyahnaSandhya: MU('Madhyahna Sandhya', 'Neutral',           'Purification',      'Primarily ritualistic significance.', 0),
  sayahanaSandhya:  MU('Sayahana Sandhya',  'Neutral',           'Purification',      'Primarily ritualistic significance.', 0),
  // Inauspicious (no bonus)
  gulikaKalam:      MU('Gulika Kalam', 'Inauspicious',        'Delay',           'Traditionally avoided for business commencement, contracts, investments, registrations, and important transactions.'),
  yamaGanda:        MU('Yama Ganda',   'Inauspicious',        'Obstruction',     'Traditionally avoided for new undertakings and major decisions.'),
  rahuKalam:        MU('Rahu Kalam',   'Inauspicious',        'Illusion & Delay','Traditionally avoided for contracts, investments, launches, negotiations, and major undertakings.'),
  varjyam:          MU('Varjyam',      'Inauspicious',        'Void',            'Void period. Major undertakings, agreements, and financial activities are avoided.'),
  baana:            MU('Baana',        'Inauspicious',        'Loss',            'Associated with loss, theft, obstacles, and failure in material undertakings.', undefined, 0.9),
  vidalYoga:        MU('Vidal Yoga',   'Inauspicious',        'Disruption',      'Creates disruptions, inefficiencies, and obstructions to successful completion.', undefined, 0.9),
  durMuhurta:       MU('Dur Muhurta',  'Highly Inauspicious', 'Misfortune',      'Traditionally prohibited for major business, legal, contractual, and financial activity.'),
  bhadra:           MU('Bhadra',       'Highly Inauspicious', 'Obstruction',     'Traditionally prohibited for contracts, agreements, registrations, investments, tenders, and commercial undertakings.'),
};

// Special yogas (scraped from DrikPanchang per day). MU(name, classification, nature, significance, bonus).
// Order matches the source table (Sr).
export const SPECIAL_YOGA_INFO: Record<string, MuhurtaInfo> = {
  amritaSiddhi:    MU('Amrita Siddhi',    'Exceptionally Auspicious', 'Prosperity & Longevity',     'Supports prosperity, wealth creation, long-term growth, enduring success, and favorable outcomes.', 15),
  tripushkar:      MU('Tripushkara',      'Exceptionally Auspicious', 'Repeated Prosperity',        'Favors recurring gains, sustained profitability, long-term commercial success, and wealth generation.', 15),
  guruPushya:      MU('Guru Pushya',      'Exceptionally Auspicious', 'Wealth & Growth',            'One of the best combinations for investments, company formation, banking, contracts, asset purchases, and business expansion.', 15),
  raviPushya:      MU('Ravi Pushya',      'Exceptionally Auspicious', 'Wealth & Success',           'Excellent for business launches, acquisitions, financial transactions, contracts, and commercial initiatives.', 15),
  dwipushkar:      MU('Dwipushkara',      'Very Highly Auspicious',   'Multiplication & Growth',    'Activities initiated tend to generate repeated benefits and growth; excellent for investments and expansion.', 12),
  sarvarthaSiddhi: MU('Sarvartha Siddhi', 'Very Highly Auspicious',   'Universal Success',          'Excellent for company incorporation, strategic agreements, commercial expansion, major contracts, and investments.', 10),
  raviYoga:        MU('Ravi',             'Highly Auspicious',        'Success & Obstacle Removal', 'Removes obstacles and enhances success in contracts, registrations, negotiations, tenders, filings, and important business decisions.', 8),
};
