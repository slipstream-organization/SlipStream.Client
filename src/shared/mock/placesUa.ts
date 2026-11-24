/**
 * Place names in Ukrainian for the calendar — mock of the localised fields the API sends
 * (`localized.grandPrix`, `localized.city`, `localized.country`). Keyed by the event slug.
 */
export interface PlaceUa {
  /** "Гран-прі Японії" */
  grandPrix: string;
  /** the poster headline: the city (or the circuit's town) */
  city: string;
  country: string;
}

export const PLACES_UA: Record<string, PlaceUa> = {
  'testing-1': { grandPrix: 'Передсезонні тести, день 1–3', city: 'Сахір', country: 'Бахрейн' },
  'testing-2': { grandPrix: 'Передсезонні тести, день 4–6', city: 'Сахір', country: 'Бахрейн' },
  australia: { grandPrix: 'Гран-прі Австралії', city: 'Мельбурн', country: 'Австралія' },
  china: { grandPrix: 'Гран-прі Китаю', city: 'Шанхай', country: 'Китай' },
  japan: { grandPrix: 'Гран-прі Японії', city: 'Сузука', country: 'Японія' },
  miami: { grandPrix: 'Гран-прі Маямі', city: 'Маямі', country: 'США' },
  canada: { grandPrix: 'Гран-прі Канади', city: 'Монреаль', country: 'Канада' },
  monaco: { grandPrix: 'Гран-прі Монако', city: 'Монако', country: 'Монако' },
  barcelona: { grandPrix: 'Гран-прі Барселони-Каталонії', city: 'Барселона', country: 'Іспанія' },
  austria: { grandPrix: 'Гран-прі Австрії', city: 'Шпільберг', country: 'Австрія' },
  'great-britain': { grandPrix: 'Гран-прі Великої Британії', city: 'Сильверстоун', country: 'Велика Британія' },
  belgium: { grandPrix: 'Гран-прі Бельгії', city: 'Спа', country: 'Бельгія' },
  hungary: { grandPrix: 'Гран-прі Угорщини', city: 'Будапешт', country: 'Угорщина' },
  netherlands: { grandPrix: 'Гран-прі Нідерландів', city: 'Зандворт', country: 'Нідерланди' },
  italy: { grandPrix: 'Гран-прі Італії', city: 'Монца', country: 'Італія' },
  madrid: { grandPrix: 'Гран-прі Іспанії', city: 'Мадрид', country: 'Іспанія' },
  azerbaijan: { grandPrix: 'Гран-прі Азербайджану', city: 'Баку', country: 'Азербайджан' },
  singapore: { grandPrix: 'Гран-прі Сінгапуру', city: 'Сінгапур', country: 'Сінгапур' },
  'united-states': { grandPrix: 'Гран-прі США', city: 'Остін', country: 'США' },
  mexico: { grandPrix: 'Гран-прі Мехіко', city: 'Мехіко', country: 'Мексика' },
  brazil: { grandPrix: 'Гран-прі Сан-Паулу', city: 'Сан-Паулу', country: 'Бразилія' },
  'las-vegas': { grandPrix: 'Гран-прі Лас-Вегаса', city: 'Лас-Вегас', country: 'США' },
  qatar: { grandPrix: 'Гран-прі Катару', city: 'Лусаїл', country: 'Катар' },
  'abu-dhabi': { grandPrix: 'Гран-прі Абу-Дабі', city: 'Яс-Марина', country: 'ОАЕ' },
};

export const placeUa = (slug: string, fallback: string): PlaceUa => PLACES_UA[slug] ?? { grandPrix: fallback, city: fallback, country: fallback };
