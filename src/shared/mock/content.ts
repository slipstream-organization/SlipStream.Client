import type { NewsItem } from '../model/types';
import { driverPhoto, teamCar } from '../lib/media';
import { ARTICLES } from './articles';


/** Card-level data; full text, lead, quotes and authors live in articles.ts. */
const BASE: Omit<NewsItem, 'slug'>[] = [
  {
    id: 'austin-preview',
    relatedDriverIds: ['ANT','RUS','LEC','HAM'],
    image: { src: teamCar('mercedes', 400), kind: 'car' },
    title: 'Остін чекає: чи зможе хтось зупинити Антонеллі на COTA?',
    excerpt: 'Mercedes везе в Техас оновлену підлогу, а Ferrari — новий пакет для швидких поворотів першого сектора. Розбираємо, на що звернути увагу у вікенд.',
    tag: 'Превʼю',
    date: '2026-10-20',
    readMinutes: 6,
    circuitId: 'americas',
  },
  {
    id: 'title-maths',
    relatedDriverIds: ['ANT','RUS'],
    image: { src: driverPhoto('ANT', '4col')!, kind: 'driver' },
    title: 'Математика титулу: коли Mercedes може закрити сезон',
    excerpt: 'Після Сінгапуру відрив лідера настільки великий, що чемпіонство може вирішитись уже в Мексиці. Рахуємо всі сценарії.',
    tag: 'Аналітика',
    date: '2026-10-18',
    readMinutes: 4,
    circuitId: 'rodriguez',
  },
  {
    id: 'hamilton-ferrari',
    relatedDriverIds: ['HAM','LEC'],
    image: { src: driverPhoto('HAM', '4col')!, kind: 'driver' },
    title: 'Другий сезон Гамільтона у Ferrari: що змінилось після Барселони',
    excerpt: 'Перший рік пішов на адаптацію, другий — на результат. Дивимось на сезон семиразового чемпіона через цифри.',
    tag: 'Пілоти',
    date: '2026-10-16',
    readMinutes: 5,
    circuitId: 'catalunya',
  },
  {
    id: 'cadillac-debut',
    relatedDriverIds: ['PER','BOT'],
    image: { src: teamCar('cadillac', 400), kind: 'car' },
    title: 'Cadillac: перший сезон у цифрах',
    excerpt: 'Від тестів у Бахрейні до перших очок — як новачок чемпіонату адаптувався до регламенту 2026 року.',
    tag: 'Команди',
    date: '2026-10-14',
    readMinutes: 7,
    circuitId: 'bahrain',
  },
  {
    id: 'active-aero',
    relatedDriverIds: ['NOR','PIA'],
    image: { src: teamCar('mclaren', 400), kind: 'car' },
    title: 'Активна аеродинаміка: що ми дізнались за 16 етапів',
    excerpt: 'X-mode, Z-mode і нова енергетична стратегія. Технічний розбір того, як нові правила змінили гонки.',
    tag: 'Техніка',
    date: '2026-10-12',
    readMinutes: 9,
    circuitId: 'monza',
  },
  {
    id: 'singapore-review',
    relatedDriverIds: ['RUS','ANT','NOR'],
    image: { src: driverPhoto('RUS', '4col')!, kind: 'driver' },
    title: 'Сінгапур: нічна гонка, дві машини безпеки і тиск до останнього кола',
    excerpt: 'Найкращі моменти Гран-прі Сінгапуру — обгони, стратегія та радіо, яке всі обговорюють.',
    tag: 'Огляд',
    date: '2026-10-11',
    readMinutes: 5,
    circuitId: 'marina_bay',
  },
  {
    id: 'rookie-watch',
    relatedDriverIds: ['LIN','LAW'],
    image: { src: teamCar('racing_bulls', 400), kind: 'car' },
    title: 'Ліндблад: найкращий новачок року?',
    excerpt: 'Британський дебютант Racing Bulls регулярно потрапляє в Q3. Порівнюємо його з напарником.',
    tag: 'Пілоти',
    date: '2026-10-08',
    readMinutes: 4,
    circuitId: 'silverstone',
  },
  {
    id: 'verstappen-reset',
    relatedDriverIds: ['VER', 'HAD'],
    image: { src: driverPhoto('VER', '4col')!, kind: 'driver' },
    title: 'Ферстаппен і нова ера: найважчий сезон чемпіона в цифрах',
    excerpt: 'Red Bull складно стартувала в еру 2026. Дивимось, де команда втрачає і що змінилось у другій половині сезону.',
    tag: 'Пілоти',
    date: '2026-10-06',
    readMinutes: 5,
    circuitId: 'red_bull_ring',
  },
  {
    id: 'mclaren-number-one',
    relatedDriverIds: ['NOR', 'PIA'],
    image: { src: driverPhoto('NOR', '4col')!, kind: 'driver' },
    title: 'Норріс з номером 1: як чемпіон захищає титул у новій ері',
    excerpt: 'McLaren втратила перевагу 2025 року, але Ландо стабільно привозить очки. Розбір сезону чинного чемпіона.',
    tag: 'Аналітика',
    date: '2026-10-04',
    readMinutes: 6,
    circuitId: 'silverstone',
  },
  {
    id: 'leclerc-quali',
    relatedDriverIds: ['LEC'],
    image: { src: driverPhoto('LEC', '4col')!, kind: 'driver' },
    title: 'Леклер і суботи: чому Ferrari сильніша в кваліфікаціях, ніж у гонках',
    excerpt: 'Розбираємо деградацію шин і роботу енергосистеми — і що це означає для Остіна.',
    tag: 'Техніка',
    date: '2026-10-02',
    readMinutes: 7,
    circuitId: 'monaco',
  },
  {
    id: 'alonso-45',
    relatedDriverIds: ['ALO', 'STR'],
    image: { src: driverPhoto('ALO', '4col')!, kind: 'driver' },
    title: 'Алонсо в 45: найдосвідченіший пілот пелотону і нова Aston Martin',
    excerpt: 'Перший сезон Aston Martin з двигуном Honda і роль досвіду в новій ері. Розбір на цифрах сезону.',
    tag: 'Пілоти',
    date: '2026-09-29',
    readMinutes: 4,
    circuitId: 'catalunya',
  },
  {
    id: 'hadjar-promotion',
    relatedDriverIds: ['HAD', 'VER'],
    image: { src: driverPhoto('HAD', '4col')!, kind: 'driver' },
    title: 'Хаджар у Red Bull: перший сезон поруч із Ферстаппеном',
    excerpt: 'Подіум у Зандворті 2025 привів його в Red Bull. Як француз справляється з місцем поруч із Ферстаппеном.',
    tag: 'Пілоти',
    date: '2026-09-25',
    readMinutes: 5,
    circuitId: 'monaco',
  },
  {
    id: 'sainz-williams',
    relatedDriverIds: ['SAI', 'ALB'],
    image: { src: teamCar('williams', 400), kind: 'car' },
    title: 'Williams повертається: Сайнс і Албон тягнуть команду вгору',
    excerpt: 'Як новий регламент дав шанс одній із найтитулованіших команд в історії.',
    tag: 'Команди',
    date: '2026-09-20',
    readMinutes: 6,
    circuitId: 'madring',
  },
];

/** Summaries + full text merged: slug = id, body/author/tags from articles.ts. */
export const NEWS: NewsItem[] = BASE.map((n) => {
  const a = ARTICLES[n.id];
  // the body is built on request from live data (shared/api → newsArticle)
  return { ...n, slug: n.id, author: a?.author, tags: a?.tags, relatedTeamIds: a?.relatedTeamIds, lead: a?.lead, quotes: a?.quotes };
});

export interface Highlight {
  id: string;
  title: string;
  duration: string;
}

export const HIGHLIGHTS: Highlight[] = [
  { id: 'h1', title: 'Старт і перше коло', duration: '2:14' },
  { id: 'h2', title: 'Найкращі обгони гонки', duration: '4:02' },
  { id: 'h3', title: 'Піт-стопи та стратегія', duration: '3:11' },
  { id: 'h4', title: 'Останні 5 кіл', duration: '3:47' },
  { id: 'h5', title: 'Радіо команд — найкраще', duration: '2:58' },
];
