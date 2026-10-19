import mongoose from 'mongoose';
import config from './config/index.js';
import User from './models/User.js';
import SchoolClass from './models/SchoolClass.js';
import AcademicYear from './models/AcademicYear.js';
import FeeStructure from './models/FeeStructure.js';
import FeeItem from './models/FeeItem.js';
import Setting from './models/Setting.js';
import UniformItem from './models/UniformItem.js';
import UniformStockTransaction from './models/UniformStockTransaction.js';
import InventoryItem from './models/InventoryItem.js';
import Student from './models/Student.js';
import Payment from './models/Payment.js';
import { nextSequence, pad } from './utils/sequence.js';
import { refreshUniformEntitlements } from './services/feeService.js';

// ============================================================================
// SYSTEM USERS
// ============================================================================
const SYSTEM_USERS = [
  {
    fullName: 'System Administrator',
    username: 'nicjbdede@gmail.com',
    email: 'nicjbdede@gmail.com',
    password: 'admin12345',
    role: 'SUPER_ADMIN',
  },
  {
    fullName: 'School Accountant',
    username: 'karizaallen@gmail.com',
    email: 'karizaallen@gmail.com',
    password: 'kariza@12345',
    role: 'ACCOUNTANT',
  },
  {
    fullName: 'Big Boss',
    username: 'dushimedavid115@gmail.com',
    email: 'dushimedavid115@gmail.com',
    password: 'dushimimanad12345',
    role: 'BIG_BOSS',
  },
];

// ============================================================================
// FEES
// ============================================================================
// Uniform is optional for every student. Price: P4 & P5 = 33,000 FRW,
// all other classes = 32,000 FRW. Only school fees + materials are required.
const CLASS_FEES = {
  N1: { school: 68000, materials: 30000, uniform: 32000 },
  N2: { school: 68000, materials: 30000, uniform: 32000 },
  N3: { school: 68000, materials: 30000, uniform: 32000 },
  P1: { school: 71000, materials: 30000, uniform: 32000 },
  P2: { school: 71000, materials: 30000, uniform: 32000 },
  P3: { school: 71000, materials: 30000, uniform: 32000 },
  P4: { school: 71000, materials: 35000, uniform: 33000 },
  P5: { school: 71000, materials: 35000, uniform: 33000 },
};

const MATERIALS = [
  { name: 'Exercise Books', price: 10000 },
  { name: 'School Books', price: 15000 },
  { name: 'Pens & Stationery', price: 5000 },
];

const MATERIALS_P45 = [
  { name: 'Exercise Books', price: 10000 },
  { name: 'School Books', price: 20000 },
  { name: 'Pens & Stationery', price: 5000 },
];

const UNIFORM_FEE_ITEMS = [
  { name: 'Uniform Ikabutura', price: 8000 },
  { name: 'Uniform Ijipo', price: 8000 },
  { name: 'Uniform Ishati', price: 7000 },
  { name: 'Sport Ikabutura', price: 5000 },
  { name: 'Sport Umupira', price: 3000 },
  { name: 'Socks Uniform', price: 1000 },
  { name: 'Socks Sport', price: 500 },
  { name: 'Umupira', price: 10000 },
];

// ============================================================================
// UNIFORM STOCK LEDGER (L.P.A Rulindo report, 2026-2027, dated 08/10/2026)
// ============================================================================
// Item order used by every row of STOCK_DELIVERIES below.
const UNIFORM_STOCK = [
  { name: 'Uniform Ikabutura', received: 48, sold: 16, returned: 23, inStock: 9, price: 8000 },
  { name: 'Uniform Ijipo', received: 47, sold: 44, returned: 2, inStock: 1, price: 8000 },
  { name: 'Uniform Ishati', received: 61, sold: 46, returned: 7, inStock: 8, price: 7000 },
  { name: 'Sport Ikabutura', received: 61, sold: 38, returned: 14, inStock: 9, price: 5000 },
  { name: 'Sport Umupira', received: 41, sold: 23, returned: 8, inStock: 10, price: 3000 },
  { name: 'Socks Uniform', received: 55, sold: 46, returned: 0, inStock: 9, price: 1000 },
  { name: 'Socks Sport', received: 66, sold: 48, returned: 0, inStock: 18, price: 500 },
  { name: 'Umupira', received: 56, sold: 51, returned: 0, inStock: 5, price: 10000 },
];

// Date-by-date deliveries; columns follow UNIFORM_STOCK order.
const STOCK_DELIVERIES = [
  { date: '2026-08-31', label: 'Opening stock (Stok isanzwe)', qty: [6, 7, 0, 5, 3, 1, 0, 6] },
  { date: '2026-09-01', qty: [6, 12, 3, 13, 1, 12, 12, 0] },
  { date: '2026-09-03', qty: [0, 0, 8, 0, 0, 0, 0, 0] },
  { date: '2026-09-06', qty: [2, 9, 16, 16, 0, 0, 0, 0] },
  { date: '2026-09-08', qty: [10, 0, 0, 20, 20, 12, 24, 0] },
  { date: '2026-09-14', qty: [10, 0, 0, 0, 0, 0, 0, 0] },
  { date: '2026-09-15', qty: [0, 10, 10, 1, 0, 0, 0, 0] },
  { date: '2026-09-16', qty: [0, 0, 0, 0, 0, 30, 30, 0] },
  { date: '2026-09-21', qty: [0, 0, 0, 0, 0, 0, 0, 30] },
  { date: '2026-09-22', qty: [0, 0, 5, 2, 4, 0, 0, 0] },
  { date: '2026-09-28', qty: [0, 0, 0, 0, 10, 0, 0, 0] },
  { date: '2026-10-01', qty: [14, 5, 16, 0, 0, 0, 0, 0] },
  { date: '2026-10-02', qty: [0, 2, 3, 0, 0, 0, 0, 0] },
  { date: '2026-10-06', qty: [0, 0, 0, 0, 0, 0, 0, 20] },
  { date: '2026-10-07', qty: [0, 0, 0, 3, 3, 0, 0, 0] },
];

// ============================================================================
// UNIFORMS TAKEN BY STUDENTS — "UKO ABANYESHURI BAFASHE IMYENDA"
// ============================================================================
// One row = one line of the Word table (a child can appear on two lines; each
// line is a separate pick-up). `items` = the columns marked "1":
//   J  = Uniform Ijipo        K  = Uniform Ikabutura   S  = Uniform Ishati
//   SK = Sport Ikabutura      SU = Sport Umupira       U  = Umupira
//   SO = Socks (amasogisi) Uniform                     SP = Socks (amasogisi) Sport
const UNIFORM_CODES = {
  J: 'Uniform Ijipo',
  K: 'Uniform Ikabutura',
  S: 'Uniform Ishati',
  SK: 'Sport Ikabutura',
  SU: 'Sport Umupira',
  U: 'Umupira',
  SO: 'Socks Uniform',
  SP: 'Socks Sport',
};
// The Word list has no dates; this is the day it was handed in.
const UNIFORM_TAKEN_DATE = '2026-10-19';
const UNIFORM_TAKEN = [
  { no: 1, name: 'INEZA KUNDWA AVILLA', items: 'SK SU U SO SP' },
  { no: 2, name: 'IRANEZEZA MPANO BRAYAN', items: 'U SP' },
  { no: 3, name: 'MUSHAMBO ASSAN ASIFU', items: 'SO SP' },
  { no: 4, name: 'NDAGIJIMANA IRAKOZENICOLE', items: 'K S SK SU U SO SP' },
  { no: 5, name: 'AHIRWE MUGABO JUNIOR', items: 'K SK SU SP' },
  { no: 6, name: 'IRANEZEZA MPANO BRAYAN', items: 'K S SK SU SO SP' },
  { no: 7, name: 'IBAMBE KEZA MERVEILLE', items: 'S SK SU SP' },
  { no: 8, name: 'GANZA LOGAN DYLAN', items: 'K S SK SU SO SP' },
  { no: 9, name: 'RINGUYENEZA SIEF ALDIN', items: 'K S SK SU SP' },
  { no: 10, name: 'NIYOMUNEZERO SAMUEL', items: 'K S SK SU SO SP' },
  { no: 11, name: 'IRAKOZE DESTINE', items: 'K S SK SU SP' },
  { no: 12, name: 'TUYISHIME ORNELLA', items: 'J S SO SP' },
  { no: 13, name: 'IGIHOZO JEHOVANIS', items: 'J S SK SU SO SP' },
  { no: 14, name: 'KUNDWA ANDRY MALO GLAD', items: 'K S SO SP' },
  { no: 15, name: 'SEZERANO LOUIS BLAISE', items: 'K S SK SU' },
  { no: 16, name: 'CYUSA IMENA HENRY', items: 'S SK SU SO SP' },
  { no: 17, name: 'AGANZE HAPPY MERCI', items: 'K S SK SU SP' },
  { no: 18, name: 'IRIZA AYAN DAVINA', items: 'J K SK SU SP' },
  { no: 19, name: 'IRANKUNDA FRANK', items: 'K S SK SU' },
  { no: 20, name: 'INEZA HIRWA SANDRA', items: 'J SK SU SP' },
  { no: 21, name: 'INEZA DANIELLA', items: 'J S SO SP' },
  { no: 22, name: 'IGIHOZO BIGILIMANA BRIELLA', items: 'J S SK SU SO SP' },
  { no: 23, name: 'IRATABARA YAKINI', items: 'J S SP' },
  { no: 24, name: 'MUGISHA GIFT GLORIA', items: 'J SK SU' },
  { no: 25, name: 'UWACU KUNDWA JESSY', items: 'K S SK SU SP' },
  { no: 26, name: 'UWAYO NEILLA RAFA', items: 'S SK SU SP' },
  { no: 27, name: 'NIYOMUKIZA EMEMA', items: 'S SK SU SP' },
  { no: 28, name: 'ASHIMWE GANZA GUYANE', items: 'K S' },
  { no: 29, name: 'NTWALI LOIC HERTIER', items: 'K SP' },
  { no: 30, name: 'MUGABO LEVIS', items: 'K SK SU SP' },
  { no: 31, name: 'NDACYAYISENGA KUNDWA SHEMA JUNIOR DAGHOBERT', items: 'SK SU SO SP' },
  { no: 32, name: 'MUTUYIMANA DAYELA', items: 'J SP' },
  { no: 33, name: 'ISHIMWE KEVIN LODRIGO', items: 'SO SP' },
  { no: 34, name: 'NIYONGIRA JEAN D’AMOUR', items: 'K S SO SP' },
  { no: 35, name: 'NIYONKURU OLGA', items: 'SK SU' },
  { no: 36, name: 'HIRWA SHAMI PHILIPPE', items: 'SO SP' },
  { no: 37, name: 'MUCYO YARSI YASSAH', items: 'K S SK SU SP' },
  { no: 38, name: 'INEZAYIMANA MILLA GABRIELLA', items: 'J S SK SU SO SP' },
  { no: 39, name: 'ISHIMWE LOUANGE TRECY', items: 'SK SU SO SP' },
  { no: 40, name: 'SHAMI JEAN AIME MUHOZA', items: 'K S SO SP' },
  { no: 41, name: 'GANZA AYAN', items: 'K S SK SU U SO SP' },
  { no: 42, name: 'AKUZWE LANA NICOLE', items: 'J S SK SU U SO SP' },
  { no: 43, name: 'BIGWI NICOLAS SEZERANO', items: 'K S SK SU U SO SP' },
  { no: 44, name: 'IRANKUNDA SHAMI CHANELA', items: 'SK SU SO SP' },
  { no: 45, name: 'UWIGISUBIZO OLGA JOICE', items: 'J S SK SU U SO SP' },
  { no: 46, name: 'NGANJI DARCY ASHA KENDRIK', items: 'S SK U SO SP' },
  { no: 47, name: 'MUGISHA GIFT GLORIA', items: 'S' },
  { no: 48, name: 'SHIMWA INEZA HORORE', items: 'U SO SP' },
  { no: 49, name: 'INEZA HAPPY CHALOM', items: 'J SK SU U SO SP' },
  { no: 50, name: 'YUSA OWEN EMMY', items: 'K S U SO SP' },
  { no: 51, name: 'KAYITARE ISARO TRECY', items: 'J S U SO SP' },
  { no: 52, name: 'RAMBA ELIO DARCY', items: 'U SO SP' },
  { no: 53, name: 'RUGWIRO SHAMI NOLAN', items: 'J S U SO SP' },
  { no: 54, name: 'INEZA INGABIRE JESSCA', items: 'J S U SO SP' },
  { no: 55, name: 'SHAMI MIGUEL FRED', items: 'K SK SU' },
  { no: 56, name: 'NTWALI HERTIER', items: 'S U SO SP' },
  { no: 57, name: 'MFURA RANGIRA GUYANE', items: 'SP' },
  { no: 58, name: 'UWAYO DIVIN', items: 'K S' },
  { no: 59, name: 'GICU VICKY LOGAN', items: 'K S SK SU' },
  { no: 60, name: 'IZIBYOSE AIME J.DE DIEU', items: 'SK SU SO' },
];

// ============================================================================
// PAYMENT RECORDS (Mobile Money + Equity Bank lists)
// ============================================================================
const MOMO_PAYMENTS = [
  { date: '2026-09-03', studentName: 'INEZA HIRWA SANDRA', amount: 50000, payerName: 'UWAYEZU CLAUDINE' },
  { date: '2026-09-03', studentName: 'CYUSA IMENA HENRI', amount: 3000, payerName: 'NDUWALETA ERIC' },
  { date: '2026-09-05', studentName: 'GISA LEE LOGAN', amount: 50000, payerName: 'NYIRAMARIZA' },
  { date: '2026-09-05', studentName: 'KEZA ANGE KHUCH', amount: 3000, payerName: 'HABIMANA ADONAI' },
  { date: '2026-09-06', studentName: 'NIYOMUNEZERO SAMUEL', amount: 6000, payerName: 'RUSANGANWA EFREIM' },
  { date: '2026-09-06', studentName: 'CYUBAHIRO GISA LOMEON', amount: 30000, payerName: 'NIYOKWIZERWA' },
  { date: '2026-09-07', studentName: 'CYUSA IMENA HENERKO', amount: 3000, payerName: 'NDUWALETA ERIC' },
  { date: '2026-09-07', studentName: 'IRANKUNDA FRANK', amount: 109000, payerName: 'SINDINKABO VINCENT' },
  { date: '2026-09-07', studentName: 'INEZA DANIELLA', amount: 50000, payerName: 'GIRANEZA DANIEL' },
  { date: '2026-09-07', studentName: 'IGIHOZA BIGILIMANA BRIELLA', amount: 35000, payerName: 'NYECUMI J M V' },
  { date: '2026-09-07', studentName: 'SHAMI JEAN AIME MUHOZA', amount: 35000, payerName: 'NYECUMI J M V' },
  { date: '2026-09-07', studentName: 'MUCYO YARSI YASSAH', amount: 35000, payerName: 'ZANINKA MARIE REGINE' },
  { date: '2026-09-07', studentName: 'NIYOMUKIZA EMMIMA', amount: 34000, payerName: 'RUSANGANWA EFREIM' },
  { date: '2026-09-07', studentName: 'NTWALI LOIC HERTIER', amount: 80000, payerName: 'UWIZEYE ANNONCIATA' },
  { date: '2026-09-07', studentName: 'UWASE SHAMI LILOU', amount: 30000, payerName: 'BYUKUSENGE M LOUISE' },
  { date: '2026-09-07', studentName: 'IRASUBIZA ENOVA MIRACLES', amount: 30000, payerName: 'BYUKUSENGE M.LOUISE' },
  { date: '2026-09-07', studentName: 'IRAKOZE ALLIANCE RAVINIA', amount: 30000, payerName: 'BYUKUSENGE M LOUISE' },
  { date: '2026-09-07', studentName: 'MUCYO YARSI YASSAH', amount: 35000, payerName: 'ZANINKA M REGINE' },
  { date: '2026-09-07', studentName: 'UWACU KUNDWA JESSY', amount: 100000, payerName: 'IFITEBYOSE ESTER' },
  { date: '2026-09-07', studentName: 'IRASUBIZA AIME MANDELA', amount: 35000, payerName: 'UWANYIRIGIRA M.AIME' },
  { date: '2026-09-07', studentName: 'CYUBAHIRO GISA LOMEON', amount: 20000, payerName: 'NIYOKWIZERWA EDITH' },
  { date: '2026-09-08', studentName: 'GABIRO LUCKY DIOR', amount: 15000, payerName: 'UMUMARARUNGU' },
  { date: '2026-09-08', studentName: 'MUGISHA LIONEL', amount: 40000, payerName: 'MUNEZERO GLORIA' },
  { date: '2026-09-08', studentName: 'MUGABO LEVIS', amount: 45000, payerName: 'MUHAWENIMANA AFISA' },
  { date: '2026-09-08', studentName: 'NDACYAYISENGA KUNDWA SHEMA JUNIOR DAGOBERT', amount: 30000, payerName: 'NDACYAYISENGA ERIC' },
  { date: '2026-09-08', studentName: 'MUGISHA GIFT GLORIA', amount: 15000, payerName: 'UWASEKURU ALEXIS' },
  { date: '2026-09-08', studentName: 'INEZA HAPPY CHALOM', amount: 60000, payerName: 'BIZIMANA INNOCENT' },
  { date: '2026-09-08', studentName: 'UWIHIRWE ALLIANCE', amount: 6000, payerName: 'HABIMANA XXX' },
  { date: '2026-09-09', studentName: 'IGIHOZO PRECIAS BRITINNY', amount: 101000, payerName: 'UWIMBABAZI VERENE' },
  { date: '2026-09-09', studentName: 'IRIZA ANE HOPE', amount: 8000, payerName: 'NIYIGENA ODILE' },
  { date: '2026-09-09', studentName: 'NIYONGIRA JEAN D’AMOUR IVAN', amount: 50000, payerName: 'MUHIRE ALEXIS' },
  { date: '2026-09-09', studentName: 'IRAKIZA JOY', amount: 30000, payerName: 'MUKANOHERI ESPERANCE' },
  { date: '2026-09-09', studentName: 'IRABISOHOJE MUGISHA DYLAN', amount: 3000, payerName: 'UWUMUHOZA CLEMENTINE' },
  { date: '2026-09-09', studentName: 'MUTUYIMANA KARABO KEZA DAELA', amount: 100000, payerName: 'GWIZIMPUNDU VESTINE' },
  { date: '2026-09-09', studentName: 'ISHIMWE BLENDA', amount: 42000, payerName: 'MUTABAZI GILBERT' },
  { date: '2026-09-10', studentName: 'AKUZWE LANA NICOLE', amount: 25000, payerName: 'UWIHUMURE ANGE' },
  { date: '2026-09-10', studentName: 'MIGAMBI TRESOR', amount: 70000, payerName: 'NIZANE CHRISTINE' },
  { date: '2026-09-10', studentName: 'INEZAYIMANA MILLA GABRIELLA', amount: 137000, payerName: 'NZABANDORA OMEDY' },
  { date: '2026-09-11', studentName: 'GANZA AYAN', amount: 50000, payerName: 'MBARUKUZE J PAUL' },
  { date: '2026-09-13', studentName: 'GITEGO ANGE CLAUDETTE', amount: 71000, payerName: 'NIYIGENA DONATHA' },
  { date: '2026-09-13', studentName: 'GABINEZA MARIE LOUNGE', amount: 71000, payerName: 'NIYIGENA DONATHA' },
  { date: '2026-09-13', studentName: 'BENI LIGHT CLAUDIA', amount: 60000, payerName: 'NIYIGENA DONATHA' },
  { date: '2026-09-14', studentName: 'IRANKUNDA SHAMI CHANELA', amount: 16000, payerName: 'KARANGWA YVONE' },
  { date: '2026-09-14', studentName: 'IRABISOHOJE MUGISHA DYLAN', amount: 10000, payerName: 'UWUMUHOZA CLEMENTINE' },
  { date: '2026-09-14', studentName: 'KAMIKAZI TETA EMMANUELA', amount: 10000, payerName: 'NDAYISHIMIYE EMMANUEL' },
  { date: '2026-09-14', studentName: 'IGIRANEZA SHEMA', amount: 50000, payerName: 'MUGIRANEZA GASPARD' },
  { date: '2026-09-14', studentName: 'KEZA ANGE KHUCH', amount: 60000, payerName: 'MUGISHA CRISTINE' },
  { date: '2026-09-14', studentName: 'UWIGISUBIZO OLGA JOICE', amount: 40000, payerName: 'DUSABE REGINE' },
  { date: '2026-09-14', studentName: 'NGANJI ASHA KENDRIC', amount: 35000, payerName: 'MUKASAKINDI ANGELIQUE' },
  { date: '2026-09-14', studentName: 'UWAYO NEILLA RAFA', amount: 35000, payerName: 'UZARAMA ANOUALITA' },
  { date: '2026-09-14', studentName: 'NSANZINEZA LUCKY BELTRAND', amount: 45000, payerName: 'MAKUZA MAGNIFIQUE' },
  { date: '2026-09-15', studentName: 'ABIZEYIMANA CHANCELINE', amount: 30000, payerName: 'IMANISHIMWE RAHABU' },
  { date: '2026-09-15', studentName: 'INEZA DIVINE', amount: 71000, payerName: 'MUTARAMBIRWA ASMPTA' },
  { date: '2026-09-15', studentName: 'AKUZWE LANA NICOLE', amount: 25000, payerName: 'UWIHUMURE ANGE' },
  { date: '2026-09-15', studentName: 'TURIKUMWENAYO ISABELLE', amount: 71000, payerName: 'NDAYISHIMIYE JEROME' },
  { date: '2026-09-15', studentName: 'NIYOGISUBIZO CHANCE', amount: 73000, payerName: 'NDAYISHIMIYE JEROME' },
  { date: '2026-09-15', studentName: 'IRAGANJE SHEMA KENNY', amount: 69000, payerName: 'NDAYISHIMIYE JEROME' },
  { date: '2026-09-15', studentName: 'UNKNOWN', amount: 10000, payerName: 'UWINGABIYE DATIVE' },
  { date: '2026-09-15', studentName: 'MUGISHA GIFT GLORIA', amount: 15000, payerName: 'UWSEKURU ALEXIS' },
  { date: '2026-09-15', studentName: 'ISHIMWE CLEMENT', amount: 3000, payerName: 'UWAYEZU CLEMENTINE' },
  { date: '2026-09-17', studentName: 'NGANJI DARCY ASHA', amount: 98000, payerName: 'MUKASAKINDI ANGALIQUE' },
  { date: '2026-09-17', studentName: 'IRATABARA YAKINI', amount: 80000, payerName: 'SIBOBUGINGO MTHODE' },
  { date: '2026-09-17', studentName: 'IKUZO BRIELLA', amount: 30000, payerName: 'INGABIRE FLORENCE' },
  { date: '2026-09-22', studentName: 'IRABISOHOJE MUGISHA DYLAN', amount: 5000, payerName: 'UWUMUHOZA CLEMENTINE' },
  { date: '2026-09-22', studentName: 'KAYIHURA TUYISENGE MORGAN', amount: 30000, payerName: 'NYIRAMINANI' },
  { date: '2026-09-23', studentName: 'NTABWOBA ISHEJA KELLA', amount: 5000, payerName: 'GAKONDO EMMANUEL' },
  { date: '2026-09-25', studentName: 'IKUZO BRIELLA', amount: 69000, payerName: 'INGABIRE FLORENCE' },
  { date: '2026-09-25', studentName: 'INEZA AXEL', amount: 30000, payerName: 'INGABIRE FLORENCE' },
  { date: '2026-09-25', studentName: 'RUGWIRO ISHAMI NOLA ELLA', amount: 70000, payerName: 'UZAYISENGA YVONE' },
  { date: '2026-09-27', studentName: 'UMWALIWASE KENTIA', amount: 30000, payerName: 'MUKAKALISA' },
  { date: '2026-09-28', studentName: 'KEZA FAITH GIA', amount: 10000, payerName: 'NISHIMWE BEATRICE (CASH EQUITY)' },
  { date: '2026-09-29', studentName: 'MUSHAMBO ASSAN ASIFU', amount: 53000, payerName: 'UMUTONI NADIA' },
  { date: '2026-09-30', studentName: 'IRABISOHOJE MUGISHA DYLAN', amount: 15000, payerName: 'UWUMUHOZA CLEMENTINE (CASH EQUITY)' },
  { date: '2026-10-01', studentName: 'KAMANZI WISDOM EMMY', amount: 50000, payerName: 'UWAMAHORO BEATRICE (CASH BK)' },
  { date: '2026-10-01', studentName: 'INEZAYIMANA ANGE', amount: 37000, payerName: 'MUGIRANEZA GASPARD (CASH BK)' },
  { date: '2026-10-01', studentName: 'SEZERANO LOUIS BLAISE', amount: 50000, payerName: 'MANISHIMWE ROSINE (CASH BK)' },
  { date: '2026-10-01', studentName: 'IRINATWE TUNEZERWE BRAYAN', amount: 50000, payerName: 'MANISHIMWE ROSINE (CASH BK)' },
  { date: '2026-10-02', studentName: 'ISHAMI RUGWIRO NOLA ELLA', amount: 60000, payerName: 'UZAYISENGA YVONE (CASH BK)' },
  { date: '2026-10-02', studentName: 'UWASE SHAMI LILOU', amount: 66000, payerName: 'BYUKUSENGE MARIE LUOISE (CASH BK)' },
  { date: '2026-10-02', studentName: 'IRASUBIZA ENOVA MIRACLES', amount: 66000, payerName: 'BYUKUSENGE MARIE LUOISE (CASH BK)' },
  { date: '2026-10-02', studentName: 'IRAKOZE ALLIANCE RAVINIA', amount: 63000, payerName: 'BYUKUSENGE MARIE LOUISE (CASH BK)' },
  { date: '2026-10-05', studentName: 'ABIZEYIMANA CHANCELINE', amount: 20000, payerName: 'IMANISHIMWE RAHABU (CASH BK)' },
  { date: '2026-10-05', studentName: 'ISHIMWE KEVIN LODRIGO', amount: 65000, payerName: 'MUHAWENAYO JEANETTE (CASH EQUITY)' },
  { date: '2026-10-06', studentName: 'CYUZUZO IRASUBIZA RAYMOND', amount: 65000, payerName: 'NYIRANSABIMANA MONIQUE (CASH EQUITY)' },
  { date: '2026-10-06', studentName: 'GISA LEE LOGAN', amount: 30000, payerName: 'NYIRAMARIZA (CASH BK)' },
  { date: '2026-10-07', studentName: 'IGIHOZO PRECIAS BRITINNY', amount: 8000, payerName: 'UWIMBABAZI VERENE (CASH EQUITY)' },
];

const EQUITY_PAYMENTS = [
  { date: '2026-08-25', studentName: 'INEZA INGABIRE JESSCA', amount: 30000, className: 'N1' },
  { date: '2026-08-15', studentName: 'TUYISHIME ORNEILLA', amount: 100000, className: 'P3' },
  { date: '2026-08-30', studentName: 'INEZA KUNDWA AVILLA', amount: 130000, className: 'N2' },
  { date: '2026-08-31', studentName: 'GIHOZO PRINCE', amount: 3000, className: 'YARAGIYE' },
  { date: '2026-08-31', studentName: 'IGIRUMUFASHA QUEEN BLESSING', amount: 3000, className: 'YARAGIYE' },
  { date: '2026-08-31', studentName: 'IGIHOZO JEHOVANIS', amount: 87000, className: 'P5' },
  { date: '2026-08-31', studentName: 'IRANEZEZA MPANO BRAYAN', amount: 90000, className: 'N2' },
  { date: '2026-09-03', studentName: 'AGANZE IAN ENLIQUE', amount: 90000, className: 'N1' },
  { date: '2026-09-05', studentName: 'IBAMBE KEZA MERVEILLE', amount: 129000, className: 'P5' },
  { date: '2026-09-05', studentName: 'GANZA LOGAN DYLAN', amount: 52000, className: 'N1' },
  { date: '2026-09-06', studentName: 'NIYOMUNEZRO SAMUEL', amount: 50000, className: 'N2' },
  { date: '2026-09-06', studentName: 'RINGUYENEZA SEIF ALDIN', amount: 55000, className: '' },
  { date: '2026-09-06', studentName: 'UWASE KARABO AIME GAELLA', amount: 18000, className: 'P3' },
  { date: '2026-09-07', studentName: 'IRAKOZE DESTINE', amount: 50000, className: 'N2' },
  { date: '2026-09-07', studentName: 'MUVUNYI KESSIA', amount: 30000, className: 'N3' },
  { date: '2026-09-07', studentName: 'SHAMI HIRWA HILO', amount: 50000, className: '' },
  { date: '2026-09-07', studentName: 'AGANZE HAPPY MERCI', amount: 50000, className: '' },
  { date: '2026-09-07', studentName: 'SEZERANO LOUISS BLAISE', amount: 20000, className: 'P1' },
  { date: '2026-09-07', studentName: 'CYUSA IMENA HENRY', amount: 47000, className: '' },
  { date: '2026-09-07', studentName: 'NDAGIJIMANA IRASUBIZA NICOLAS', amount: 50000, className: 'N2' },
  { date: '2026-09-07', studentName: 'NDAGIJIMANA IRAKOZE NICOLE', amount: 50000, className: 'N1' },
  { date: '2026-09-07', studentName: 'SHIMWA INEZA HORORE', amount: 40000, className: 'P5' },
  { date: '2026-09-07', studentName: 'IHIRWE MILLA NSENGIYUMVA', amount: 40000, className: '' },
  { date: '2026-09-07', studentName: 'GANZA NOLAN NSENGIYUMVA', amount: 40000, className: '' },
  { date: '2026-09-07', studentName: 'IBAMBE KEZA MERVEILLE', amount: 2000, className: '' },
  { date: '2026-09-07', studentName: 'SHIMWA INEZA HORORE', amount: 2000, className: '' },
  { date: '2026-09-07', studentName: 'INEZA HIRWA SANDRA', amount: 100000, className: '' },
  { date: '2026-09-07', studentName: 'HIRWA SHAMI PHILIPPE', amount: 138000, className: '' },
  { date: '2026-09-07', studentName: 'HIRWA SHAMIPHILIPPE', amount: 6000, className: '' },
  { date: '2026-09-07', studentName: 'INEZA DIVINE LYAN', amount: 60000, className: '' },
  { date: '2026-09-07', studentName: 'UMWARIWASE', amount: 3000, className: 'N1' },
  { date: '2026-09-07', studentName: 'ABIZERA ELLA GUYANE', amount: 60000, className: 'N1' },
  { date: '2026-09-07', studentName: 'HIRWA ERICKSON', amount: 30000, className: 'P1' },
  { date: '2026-09-07', studentName: 'ISHIMWE KEVIN LODRIGO', amount: 30000, className: '' },
  { date: '2026-09-08', studentName: 'ASHIMWE LEE RAYAN', amount: 30000, className: 'P1' },
  { date: '2026-09-08', studentName: 'ASHIMWE GANZA GUYAN', amount: 30000, className: 'P5' },
  { date: '2026-09-08', studentName: 'RAMBA ELIO GARCIA', amount: 15000, className: '' },
  { date: '2026-09-08', studentName: 'UWAYO NEILLA RAFA', amount: 30000, className: 'P5' },
  { date: '2026-09-08', studentName: 'SHAMI MIGUEL FRED', amount: 50000, className: 'N3' },
  { date: '2026-09-08', studentName: 'RUBERNGEYO IHIRWE GAELLE', amount: 45000, className: '' },
  { date: '2026-09-08', studentName: 'UWAYO NEILLA RAFA', amount: 20000, className: 'P5' },
  { date: '2026-09-08', studentName: 'NIYONKURU OLGA', amount: 10000, className: 'P1' },
  { date: '2026-09-08', studentName: 'ISHIMWE KEVIN LODRIGO', amount: 6000, className: '' },
  { date: '2026-09-09', studentName: 'UMUTONIWASE QUEEN NOELLA', amount: 60000, className: 'P1' },
  { date: '2026-09-09', studentName: 'TWAGILIMANA UTUJE YVES', amount: 90000, className: '' },
  { date: '2026-09-09', studentName: 'UWAYO DIVIN', amount: 120000, className: 'N3' },
  { date: '2026-09-10', studentName: 'MUCYO YARSIN YASSAH', amount: 34000, className: 'P5' },
  { date: '2026-09-10', studentName: 'IZIBYOSE AIME JEAN DE DIEU', amount: 60000, className: 'P1' },
  { date: '2026-09-10', studentName: 'ISHIMWE LOUANGE TRECY', amount: 128000, className: '' },
  { date: '2026-09-11', studentName: 'TUYISENGE GANZA BRAYAN', amount: 65000, className: 'N2' },
  { date: '2026-09-11', studentName: 'INEZA AIME SABINE', amount: 25000, className: 'P3' },
  { date: '2026-09-11', studentName: 'MUGISHA GANZA INEZA HERTIER', amount: 25000, className: 'P1' },
  { date: '2026-09-11', studentName: 'CYUSA OWEN EMMY', amount: 60000, className: '' },
  { date: '2026-09-14', studentName: 'BIGWI SEZERANO NOCOLAS', amount: 10000, className: '' },
  { date: '2026-09-14', studentName: 'UWIGISUBIZO OLGA JOICE', amount: 40000, className: '' },
  { date: '2026-09-14', studentName: 'UWISHIMWE ESTER', amount: 30000, className: 'P2' },
  { date: '2026-09-14', studentName: 'RINGUYENEZA SEIF ALDIN', amount: 25000, className: '' },
  { date: '2026-09-14', studentName: 'IRAKIZA FAVOR RAYAN', amount: 40000, className: 'P1' },
  { date: '2026-09-14', studentName: 'IRAKOZE BLESSING IAN', amount: 40000, className: 'P1' },
  { date: '2026-09-14', studentName: 'NTABWOBA ISHEJA KELLA', amount: 71000, className: 'P4' },
  { date: '2026-09-14', studentName: 'NTABWOBA ISEZERANO KEILLA', amount: 71000, className: 'N2' },
  { date: '2026-09-15', studentName: 'WISHAVURA ANGE', amount: 55000, className: 'P3' },
  { date: '2026-09-15', studentName: 'INEZA HIRWA SANDRA', amount: 19000, className: '' },
  { date: '2026-09-15', studentName: 'ISHIMWE CLEMENT', amount: 47000, className: 'P2' },
  { date: '2026-09-15', studentName: 'AKUZWE ADELINE', amount: 50000, className: 'P3' },
  { date: '2026-09-15', studentName: 'IRISA JESSCA', amount: 50000, className: 'N2' },
  { date: '2026-09-15', studentName: 'UWAYO DIVIN', amount: 18000, className: 'N3' },
  { date: '2026-09-18', studentName: 'MUGABO LEVIS', amount: 20000, className: 'P3' },
  { date: '2026-09-21', studentName: 'HABIMANA GWIZA IRIS MIA', amount: 70000, className: 'P2' },
  { date: '2026-09-21', studentName: 'KUNDWA TETA SHILO ANAYA', amount: 60000, className: 'N2' },
  { date: '2026-09-21', studentName: 'IZIBYOSE AIME JEAN DE DIEU', amount: 20000, className: 'P1' },
  { date: '2026-09-21', studentName: 'GIKUNDIRO SHAMI JOSEPH', amount: 20000, className: 'P1' },
  { date: '2026-09-21', studentName: 'SHIMWA JEHOVANIS LYAN', amount: 25000, className: 'N2' },
  { date: '2026-09-22', studentName: 'RAMBA ELIO GARCIA', amount: 23000, className: 'N3' },
  { date: '2026-09-22', studentName: 'GANZA IAN', amount: 10000, className: 'N3' },
  { date: '2026-09-24', studentName: 'GABIRO LUCKY DIOR', amount: 30000, className: 'N2' },
  { date: '2026-09-24', studentName: 'GICU VICKY LOGAN', amount: 30000, className: 'P3' },
  { date: '2026-09-25', studentName: 'KAMIKAZI TETA EMMANUELLA', amount: 40000, className: 'P5' },
  { date: '2026-09-25', studentName: 'SHEMA KING', amount: 25000, className: 'P2' },
  { date: '2026-09-27', studentName: 'AGWIZE K.AGASARO ALELA MIA', amount: 50000, className: 'N1' },
  { date: '2026-09-27', studentName: 'CYUBAHIRO GISA LOMEON', amount: 30000, className: 'I CASH' },
  { date: '2026-09-28', studentName: 'IRAKOZE DESTINE', amount: 30000, className: '' },
  { date: '2026-09-28', studentName: 'NDAYISHIMIYE ALAIN MARIUS', amount: 25000, className: 'N3' },
  { date: '2026-09-28', studentName: 'HABIMANA GWIZA IRIS MIA', amount: 30000, className: 'P2' },
  { date: '2026-09-29', studentName: 'NDAGIJIMANA IRASUBIZA NICOLAS', amount: 23000, className: 'N2' },
  { date: '2026-09-29', studentName: 'NDAGIJIMANA IRAKOZE NICOLE', amount: 23000, className: 'N1' },
  { date: '2026-09-29', studentName: 'IMPANO BLESSING', amount: 30000, className: 'P1' },
  { date: '2026-09-29', studentName: 'KAMANZI EMMY WISDOM', amount: 50000, className: 'P1' },
  { date: '2026-09-30', studentName: 'INEZA DANIELLA', amount: 30000, className: '' },
  { date: '2026-09-30', studentName: 'IGIRANEZA RUSI', amount: 20000, className: 'P2' },
  { date: '2026-09-30', studentName: 'MUGISHA GIFT GLORIA', amount: 20000, className: 'P1' },
  { date: '2026-10-01', studentName: 'CYUSA OWEN ELLA EMMY', amount: 30000, className: '' },
  { date: '2026-10-01', studentName: 'UWASE KARABO KEMI GAELLA', amount: 50000, className: 'P3' },
  { date: '2026-10-01', studentName: 'IRANEZEZA MPANO BRAYAN', amount: 20000, className: '' },
  { date: '2026-10-06', studentName: 'GANZA LOGAN DYLAN', amount: 30000, className: '' },
  { date: '2026-10-06', studentName: 'UWIGISUBIZO OLGA JOICE', amount: 25000, className: '' },
  { date: '2026-10-06', studentName: 'NIYONGIRA JEAN D’AMOUR', amount: 65000, className: '' },
  { date: '2026-10-06', studentName: 'IRAKOZE BIONCE', amount: 62000, className: 'N1' },
  { date: '2026-10-06', studentName: 'UMUHIRE KEVIN', amount: 35000, className: 'P3' },
  { date: '2026-10-08', studentName: 'MFURA RANGIRA GIAN', amount: 20000, className: 'N3' },
];

// Summary list "URUTONDE RW'ABANA BARIRA MU KIGO N'UKO BISHYUYE" - the channel
// each paying family used. Used as the fallback payment channel/payer for any
// amount that cannot be tied to a dated MoMo / Equity line above.
const PAYMENT_CHANNELS = [
  { name: 'IGIHOZO JEHOVANIS', className: 'P5', method: 'BANK', payer: '' },
  { name: 'IRATABARA YAKINI', className: 'P5', method: 'MOBILE_MONEY', payer: 'SIBOBUGINGO METHODE' },
  { name: 'IBAMBE KEZA MERVEILLE', className: 'P5', method: 'BANK', payer: '' },
  { name: 'ISHIMWE INEZA HORORE', className: 'P5', method: 'BANK', payer: '' },
  { name: 'INEZA HIRWA SANDRA', className: 'P1', method: 'MOBILE_MONEY', payer: 'UWAYEZU CLAUDINE' },
  { name: 'UWAYO DIVIN', className: 'N3', method: 'BANK', payer: '' },
  { name: 'HIRWA SHAMI PHILIPPE', className: 'N3', method: 'BANK', payer: '' },
  { name: 'TULIKUMWENAYO ISABELLE', className: 'P4', method: 'MOBILE_MONEY', payer: 'NDAYISHIMIYE JEROME' },
  { name: 'NIYOGISUBIZO CHANCE', className: 'P3', method: 'MOBILE_MONEY', payer: 'NDAYISHIMIYE JEROME' },
  { name: 'IRAGANJE SHEMA KENNY', className: 'P2', method: 'MOBILE_MONEY', payer: 'NDAYISHIMIYE JEROME' },
  { name: 'CYUBAHIRO GISA LOMEON', className: 'P1', method: 'MOBILE_MONEY', payer: 'NIYOKWIZERWA EDITH' },
  { name: 'UMWARIWASE KENTIA', className: 'N1', method: 'MOBILE_MONEY', payer: 'MUKAKALISA' },
  { name: 'MUTUYIMANA KARABO KEZA', className: 'N3', method: 'MOBILE_MONEY', payer: 'GWIZIMPUNDU VESTINE' },
  { name: 'CYUSA OWEN EMMY', className: 'N2', method: 'BANK', payer: '' },
  { name: 'UWACU KUNDWA MEGAN', className: 'P1', method: 'MOBILE_MONEY', payer: 'IFITEBYOSE ESTER' },
  { name: 'INEZA HAPPY CHALOM', className: 'P1', method: 'MOBILE_MONEY', payer: 'BIZIMANA INNOCENT' },
  { name: 'JESSCA INEZA INGABIRE', className: 'N1', method: 'BANK', payer: '' },
  { name: 'GANZA IAN', className: 'N3', method: 'BANK', payer: '' },
];

// ============================================================================
// SCHOOL FEEDING — URUTONDE RW'ABANA BARIRA MU KIGO N'UKO BISHYUYE
// ============================================================================
// Students who eat at the school and what each family has already paid toward
// the feeding programme. `rosterName` must match a name in CLASS_ROSTERS.
// amount: 0 = eats at school but has not paid anything yet (new arrival).
// Uniform is NOT part of these amounts; P4/P5 uniform = 33,000, others = 32,000.
const MEAL_FEEDING_LIST = [
  { rosterName: 'IGIHOZO JEHOVANIS', className: 'P5', amount: 87000, method: 'BANK', payer: '' },
  { rosterName: 'IRATABARA YACKIN', className: 'P5', amount: 83000, method: 'MOBILE_MONEY', payer: 'SIBOBUGINGO METHODE' },
  { rosterName: 'IBAMBE KEZA MERVELLE', className: 'P5', amount: 144000, method: 'BANK', payer: '' },
  { rosterName: 'SHIMWA INEZA HOLORE', className: 'P5', amount: 55000, method: 'BANK', payer: '' },
  { rosterName: 'INEZA HIRWA SANDRA', className: 'P1', amount: 119000, method: 'MOBILE_MONEY', payer: 'UWAYEZU CLAUDINE' },
  { rosterName: 'UWAYO DIVIN', className: 'N3', amount: 138000, method: 'BANK', payer: '' },
  { rosterName: 'HIRWA SHAMI PHILIPE', className: 'N3', amount: 144000, method: 'BANK', payer: '' },
  { rosterName: 'TURIKUMWENAYO ISABELLE', className: 'P4', amount: 71000, method: 'MOBILE_MONEY', payer: 'NDAYISHIMIYE JEROME' },
  { rosterName: 'NIYOGISUBIZO CHANCE', className: 'P3', amount: 73000, method: 'MOBILE_MONEY', payer: 'NDAYISHIMIYE JEROME' },
  { rosterName: 'IRAGANJE HIRWA KENNY', className: 'P2', amount: 79000, method: 'MOBILE_MONEY', payer: 'NDAYISHIMIYE JEROME' },
  { rosterName: 'TUYISHIME ORNELLA', className: 'P3', amount: 10000, method: 'CASH', payer: '' },
  { rosterName: 'CYUBAHIRO GISA LOMEON', className: 'P1', amount: 50000, method: 'MOBILE_MONEY', payer: 'NIYOKWIZERWA EDITH' },
  { rosterName: 'UMWALI UWASE KETIA', className: 'N1', amount: 33000, method: 'MOBILE_MONEY', payer: 'MUKAKALISA' },
  { rosterName: 'MUTUYIMANA AKARABO KEZA DAELLA', className: 'N3', amount: 100000, method: 'MOBILE_MONEY', payer: 'GWIZIMPUNDU VESTINE' },
  { rosterName: 'CYUSA OWEN EMMY', className: 'N2', amount: 70000, method: 'BANK', payer: '' },
  { rosterName: 'UWACU KUNDWA JESSY MEGHAN', className: 'P1', amount: 100000, method: 'MOBILE_MONEY', payer: 'IFITEBYOSE ESTER' },
  { rosterName: 'INEZA HAPPY SHALLOM', className: 'P1', amount: 60000, method: 'MOBILE_MONEY', payer: 'BIZIMANA INNOCENT' },
  { rosterName: 'INEZA INGABIRE JESCA', className: 'N1', amount: 123000, method: 'BANK', payer: '' },
  { rosterName: 'GANZE IYAN', className: 'N3', amount: 63000, method: 'BANK', payer: '' },
  // NB. NSHIMYIMANA ALPHA (P5) came today — eats at school, nothing paid yet.
  { rosterName: 'Alpha NSHIMIIMANA', className: 'P5', amount: 0, method: 'CASH', payer: '' },
];
const MEAL_LIST_DATE = '2026-10-18';

// Names that are spelled so differently across sheets that fuzzy matching
// would be unsafe. Key = normalized payment-sheet name, value = roster name.
const NAME_ALIASES = {
  UMWARIWASE: 'UMWALI UWASE KETIA',
  UMWALIWASEKENTIA: 'UMWALI UWASE KETIA',
  UMWARIWASEKENTIA: 'UMWALI UWASE KETIA',
  SHAMIHIRWAHILO: 'HIRWA SHAMI HERO',
  HIRWASHAMIPHILIPPE: 'HIRWA SHAMI PHILIPE',
  HIRWASHAMIPHILIPPE2: 'HIRWA SHAMI PHILIPE',
  IGIHOZABIGILIMANABRIELLA: 'IGIHOZO B. BRIELLA',
  IGIHOZOPRECIASBRITINNY: 'AGAHOZO PRECIAS BRITINNY',
  GANZAAYAN: 'GANZE IYAN',
  TWAGILIMANAUTUJEYVES: 'UTUJE YVES',
  KAMIKAZITETAEMMANUELA: 'KAMIKAZI TETA EMMANUELLA',
  UWISHIMWEESTER: 'UWISHIMWE ESTHER',
  IGIRANEZASHEMA: 'IGIRANEZA SHEMA EWAN',
  KEZAANGEKHUCH: 'KEZA ANGE KHUCHI',
  GWIZAHABIMANAIRISMIA: 'GWIZA HABIMANA IRIS MIA',
  HABIMANAGWIZAIRISMIA: 'GWIZA HABIMANA IRIS MIA',
  INEZAAXEL: 'INEZA AXCEL',
  INEZAHAPPYCHALOM: 'INEZA HAPPY SHALLOM',
  UWACUKUNDWAJESSY: 'UWACU KUNDWA JESSY MEGHAN',
  UWACUKUNDWAMEGAN: 'UWACU KUNDWA JESSY MEGHAN',
  IRAKOZEBIONCE: 'IRAKOZE Beyonce',
  RINGUYENEZASEIFALDIN: 'RINGUYENEZA SEIF AL - DIN',
  NIYONGIRAJEANDAMOUR: "NIYONGIRA JEAN D'AMOUR",
  NIYONGIRAJEANDAMOURIVAN: "NIYONGIRA JEAN D'AMOUR",
  NDACYAYISENGAKUNDWASHEMAJUNIORDAGOBERT: 'NDACYAYISENGA SHEMA JUNIOR',
  CYUZUZOIRASUBIZARAYMOND: 'CYUZUZO NSANZINEZA RAYMOND',
  NSANZINEZALUCKYBELTRAND: 'NSANZINEZA LUCK BERTLA',
  AGWIZEKAGASAROALELAMIA: 'AGWIZE KABERA AGASARO MIA',
  GANZALOGANDYLAN: 'GANZA LOGAN DYLAN',
  ISHAMIRUGWIRONOLAELLA: 'ISHAMI RUGWIRO NORA ELLA',
  RUGWIROISHAMINOLAELLA: 'ISHAMI RUGWIRO NORA ELLA',
  KAYIHURATUYISENGEMORGAN: 'KAYIHURA TUYISENGE MOGHAN',
  IRINATWETUNEZERWEBRAYAN: 'TUNEZERWE IRINATWE BRAYAN',
  NIYOMUNEZRO: 'NIYOMUNEZERO SAMUEL',
  NIYOMUNEZROSAMUEL: 'NIYOMUNEZERO SAMUEL',
  UWIHIRWEALLIANCE: '__UNMATCHED__',
  UNKNOWN: '__UNMATCHED__',
  CYUSAIMENAHENRI: '__UNMATCHED__',
  CYUSAIMENAHENERKO: '__UNMATCHED__',
  CYUSAIMENAHENRY: '__UNMATCHED__',
  GIHOZOPRINCE: '__UNMATCHED__',
  IGIRUMUFASHAQUEENBLESSING: '__UNMATCHED__',
  MFURARANGIRAGIAN: 'MFURA RANGIRA GUYANE',
  ASHIMWEGANZAGUYAN: 'ASHIMWE GANZA GIAN',
  NTWALILOICHERTIER: 'NTWALI RIOCK HERTIER',
  IRAKOZEALLIANCERAVINIA: 'IRAKOZE ALLIANCE LAVINIA',
  UWASESHAMILILOU: 'UWASE SHAMI LELOU',
  IRAGANJESHEMAKENNY: 'IRAGANJE HIRWA KENNY',
  INEZADIVINELYAN: '__UNMATCHED__',
  NSENGIYUMVAGANZANOLAN: 'GANZA NOLLAN NSENGIYUMVA',
  SEZERANOLOUIEBLAISE: 'SEZERANO LOUIS BLAISE',
  SHIMAINEZAHORORE: 'SHIMWA INEZA HOLORE',
  SHIMWAINEZAAURORE: 'SHIMWA INEZA HOLORE',
  SHIMWAINEZAHORORE: 'SHIMWA INEZA HOLORE',
  NSANZUMUHIREDARCY: 'NSANZUMUHIRE DERCY',
  ASHIMWEGANZAGUYANE: 'ASHIMWE GANZA GIAN',
  UWIZEYIMANAMUGISHAGAEL: 'UWIZEYIMANA MUGISHA GAELLE',
  KUNDWASHILOANAYA: 'TETA SHILO KUNWDA ANAYA',
  NIYOMUKIZAEMIMA: 'NIYOMUKIZA EMIMER',
  TUYISHIMEORNEILLA: 'TUYISHIME ORNELLA',
  IRASUBIZAAIMEMANDELA: 'IRASUBIZA AIME MANDELLA',
  UWIGISUBIZOILGAJOICE: 'UWIGISUBIZO OLGA JOYCE',
  RINGUYENEZASIEFALDIN: 'RINGUYENEZA SEIF AL - DIN',
  KUNDWAANDRYMALOGLAD: 'KUNDWA ANDY MALO',
  MUTUYIMANADAYELA: 'MUTUYIMANA AKARABO KEZA DAELLA',
  IGIHOZOBIGILIMANABRIELLA: 'IGIHOZO B. BRIELLA',
  NIYOMUKIZAEMEMA: 'NIYOMUKIZA EMIMER',
  NTWALIHERTIER: 'NTWALI RIOCK HERTIER',
  NDACYAYISENGAKUNDWASHEMAJUNIORDAGHOBERT: 'NDACYAYISENGA SHEMA JUNIOR',
  NGANJIDARCYASHAKENDRIK: 'NGANJI DERCY ASHER KENDRICK',
  YUSAOWENEMMY: 'CYUSA OWEN EMMY',
  KAYITAREISAROTRECY: 'KAYITARE SARO PRETY',
  RAMBAELIODARCY: 'GALICIA RAMBA ELIO',
  RUGWIROSHAMINOLAN: 'ISHAMI RUGWIRO NORA ELLA',
  IZIBYOSEAIMEJDEDIEU: 'IZIBYOSE AIME JEAN DE DIEU',
  MUCYOYARSIYASSAH: 'MUCYO YASIRI',
  MUCYOYARSINYASSAH: 'MUCYO YASIRI',
  NIYOMUKIZAEMMIMA: 'NIYOMUKIZA EMIMER',
  NGANJIASHAKENDRIC: 'NGANJI DERCY ASHER KENDRICK',
  NGANJIDARCYASHA: 'NGANJI DERCY ASHER KENDRICK',
  IRATABARAYAKINI: 'IRATABARA YACKIN',
  AGANZEIANENLIQUE: 'AGANZE IAN ENULIQUE',
  HIRWAERICKSON: 'HIRWA ERCKISON',
  WISHAVURAANGE: 'WISHAVURA ANGEL',
  RAMBAELIOGARCIA: 'GALICIA RAMBA ELIO',
  GANZAIAN: 'GANZE IYAN',
  KAMIKAZITETAEMMANUELLA: 'KAMIKAZI TETA EMMANUELLA',
  IGIRANEZARUSI: 'IGIRANEZA RUTH',
  BENILIGHTCLAUDIA: 'BEN LIGHT CLOADIA',
};

// ============================================================================
// DAILY / WEEKLY FINANCIAL REPORTS (after the class sheets were prepared)
// ============================================================================
// Channel columns of the daily reports -> Payment.paymentMethod.
// BK = Bank of Kigali, EQ = Equity, CODE = Mobile Money code.
// If your Payment enum uses other values (e.g. 'EQUITY', 'BK'), change ONLY here.
const CHANNEL_METHOD = { BK: 'BANK', EQ: 'BANK', CODE: 'MOBILE_MONEY' };

// When true, a new payment first clears the child's outstanding MATERIALS, then
// SCHOOL_FEES (the reports record everything in one "School fees" column).
// When false, every new payment is stored as SCHOOL_FEES exactly as reported.
const SPLIT_NEW_PAYMENTS = true;

// Payments NOT in the class sheets / earlier lists. Each line appears once:
//  - week 05/10-09/10: only the 4 lines that were not already in the MoMo/Equity lists
//  - 12/10 and 14/10 daily reports (these are also inside the 12-16/10 weekly report)
//  - lines that appear ONLY in the 12-16/10 weekly report (exact day not given)
const REPORT_PAYMENTS = [
  // --- week 05/10 - 09/10/2026 (day not given -> week end) ---
  { date: '2026-10-09', studentName: 'IRANKUNDA SHAMI CHANELA', amount: 40000, channel: 'EQ', className: 'P1' },
  { date: '2026-10-09', studentName: 'UWIHIRWE ALLIANCE', amount: 15000, channel: 'CODE', className: '' },
  { date: '2026-10-09', studentName: 'INEZA DIVINE', amount: 6000, channel: 'CODE', className: 'P3' },
  { date: '2026-10-09', studentName: 'IRASUBIZA AIME MANDELA', amount: 25000, channel: 'CODE', className: 'N3' },

  // --- 12/10/2026 daily report (188,000) ---
  { date: '2026-10-12', studentName: 'IRABISOHOJE MUGISHA DYLAN', amount: 15000, channel: 'CODE', className: 'P1' },
  { date: '2026-10-12', studentName: 'NSENGIYUMVA GANZA NOLAN', amount: 50000, channel: 'EQ', className: 'P1' },
  { date: '2026-10-12', studentName: 'SEZERANO LOUIE BLAISE', amount: 30000, channel: 'CODE', className: 'P1' },
  { date: '2026-10-12', studentName: 'IRINATWE TUNEZERWE BRAYAN', amount: 30000, channel: 'CODE', className: 'N3' },
  { date: '2026-10-12', studentName: 'IRAKIZA JOY', amount: 5000, channel: 'EQ', className: 'P3' },
  { date: '2026-10-12', studentName: 'IRAKIZA JOY', amount: 15000, channel: 'CODE', className: 'P3' },
  { date: '2026-10-12', studentName: 'MUGABO LEVIS', amount: 20000, channel: 'EQ', className: 'P3' },
  { date: '2026-10-12', studentName: 'SHIMA INEZA HORORE', amount: 23000, channel: 'EQ', className: 'P5' },

  // --- 14/10/2026 daily report (235,000) ---
  { date: '2026-10-14', studentName: 'NSANZUMUHIRE DARCY', amount: 15000, channel: 'EQ', className: 'N3' },
  { date: '2026-10-14', studentName: 'ASHIMWE GANZA GIAN', amount: 50000, channel: 'EQ', className: 'P5' },
  { date: '2026-10-14', studentName: 'UWIZEYIMANA MUGISHA GAEL', amount: 40000, channel: 'EQ', className: 'P1' },
  { date: '2026-10-14', studentName: 'ABIZEYIMANA CHANCELINE', amount: 20000, channel: 'CODE', className: 'P1' },
  { date: '2026-10-14', studentName: 'NDAYISHIMIYE ALAIN MARIUS', amount: 10000, channel: 'CODE', className: 'N3' },
  { date: '2026-10-14', studentName: 'NIYONKURU OLGA', amount: 100000, channel: 'CODE', className: 'P1' },

  // --- only in the 12/10 - 16/10 weekly report (181,000; day not given -> 16/10) ---
  { date: '2026-10-16', studentName: 'TUYISHIME ORNEILLA', amount: 23000, channel: 'EQ', className: 'P3' },
  { date: '2026-10-16', studentName: 'UWAYO DIVIN', amount: 10000, channel: 'CODE', className: 'N3' },
  { date: '2026-10-16', studentName: 'KUNDWA SHILO ANAYA', amount: 20000, channel: 'CODE', className: 'N2' },
  { date: '2026-10-16', studentName: 'NDAYISHIMIYE ALAIN MARIUS', amount: 6000, channel: 'CODE', className: 'N3' },
  { date: '2026-10-16', studentName: 'NIYOMUKIZA EMIMA', amount: 30000, channel: 'EQ', className: 'P5' },
  { date: '2026-10-16', studentName: 'NIYOMUNEZERO SAMUEL', amount: 20000, channel: 'EQ', className: 'N2' },
  { date: '2026-10-16', studentName: 'IZIBYOSE AIME JEAN DE DIEU', amount: 12000, channel: 'EQ', className: 'P1' },
  { date: '2026-09-04', studentName: 'KUNDWA ANDY MALO', amount: 60000, channel: 'EQ', className: 'N1' }, // report note: "LE 04/09"
];

// ============================================================================
// CLASS ROSTERS (from the class payment sheets, N1 to P5)
// ============================================================================
const CLASS_ROSTERS = [
  // Primary 5 (P5)
  { className: 'P5', name: 'SHIMWA INEZA HOLORE', fatherPhone: '0788859199', motherPhone: '0783301417', materialsPaid: 35000, feesPaid: 0, balance: 71000, uniformPaid: 20000, totalPaid: 55000 },
  { className: 'P5', name: 'IBAMBE KEZA MERVELLE', fatherPhone: '0788538791', motherPhone: '0785378967', materialsPaid: 0, feesPaid: 71000, balance: 35000, uniformPaid: 33000, totalPaid: 104000 },
  { className: 'P5', name: 'CYUZUZO NSANZINEZA RAYMOND', fatherPhone: '0783150412', motherPhone: '0788578379', materialsPaid: 35000, feesPaid: 0, balance: 71000, uniformPaid: 0, totalPaid: 35000 },
  { className: 'P5', name: 'UWAYO NEILA RAFFA', fatherPhone: '0788505526', motherPhone: '0793769845', materialsPaid: 35000, feesPaid: 17000, balance: 54000, uniformPaid: 33000, totalPaid: 85000 },
  { className: 'P5', name: 'MUCYO YASIRI', fatherPhone: '0783085607', motherPhone: '0788512301', materialsPaid: 35000, feesPaid: 36000, balance: 35000, uniformPaid: 33000, totalPaid: 104000 },
  { className: 'P5', name: 'ASHIMWE GANZA GIAN', fatherPhone: '', motherPhone: '0788422196', materialsPaid: 0, feesPaid: 0, balance: 106000, uniformPaid: 33000, totalPaid: 33000 },
  { className: 'P5', name: 'NIYOMUKIZA EMIMER', fatherPhone: '0788527584', motherPhone: '0783661438', materialsPaid: 37000, feesPaid: 2000, balance: 67000, uniformPaid: 0, totalPaid: 39000 },
  { className: 'P5', name: 'IGIHOZO JEHOVANIS', fatherPhone: '0784639464', motherPhone: '07888142000', materialsPaid: 35000, feesPaid: 19000, balance: 52000, uniformPaid: 33000, totalPaid: 87000 },
  { className: 'P5', name: 'NTWALI RIOCK HERTIER', fatherPhone: '', motherPhone: '', materialsPaid: 35000, feesPaid: 12000, balance: 59000, uniformPaid: 33000, totalPaid: 80000 },
  { className: 'P5', name: 'IRATABARA YACKIN', fatherPhone: '', motherPhone: '', materialsPaid: 35000, feesPaid: 15000, balance: 56000, uniformPaid: 33000, totalPaid: 83000 },
  { className: 'P5', name: 'Alpha NSHIMIIMANA', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 0, balance: 106000, uniformPaid: 0, totalPaid: 0 },

  // Primary 4 (P4)
  { className: 'P4', name: 'KAYITARE SARO PRETY', fatherPhone: '', motherPhone: '0795979521', materialsPaid: 0, feesPaid: 0, balance: 106000, uniformPaid: 10000, totalPaid: 10000 },
  { className: 'P4', name: 'GITEGO ANGE CLAUDETTE', fatherPhone: '', motherPhone: '', materialsPaid: 35000, feesPaid: 71000, balance: 0, uniformPaid: 0, totalPaid: 106000 },
  { className: 'P4', name: 'NTABWOBA ISHEJA KELLA', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 71000, balance: 35000, uniformPaid: 0, totalPaid: 71000 },
  { className: 'P4', name: 'TURIKUMWENAYO ISABELLE', fatherPhone: '', motherPhone: '', materialsPaid: 35000, feesPaid: 36000, balance: 35000, uniformPaid: 0, totalPaid: 71000 },
  { className: 'P4', name: 'IGIRANEZA SHEMA EWAN', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 50000, balance: 56000, uniformPaid: 0, totalPaid: 50000 },
  { className: 'P4', name: 'NGABONZIZA GANZA MILTON', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 0, balance: 106000, uniformPaid: 0, totalPaid: 0 },
  { className: 'P4', name: 'KAMIKAZI TETA EMMANUELLA', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 50000, balance: 56000, uniformPaid: 0, totalPaid: 50000 },

  // Primary 3 (P3)
  { className: 'P3', name: 'TUYISHIME ORNELLA', fatherPhone: '0782858748', motherPhone: '0728686555', materialsPaid: 30000, feesPaid: 48000, balance: 23000, uniformPaid: 32000, totalPaid: 110000 },
  { className: 'P3', name: 'INEZA AIME SABINE', fatherPhone: '0788365541', motherPhone: '0790329602', materialsPaid: 0, feesPaid: 25000, balance: 76000, uniformPaid: 0, totalPaid: 25000 },
  { className: 'P3', name: 'GABINEZA MARIE LOUANGE', fatherPhone: '0780768944', motherPhone: '0787562953', materialsPaid: 0, feesPaid: 71000, balance: 30000, uniformPaid: 0, totalPaid: 71000 },
  { className: 'P3', name: 'INEZA DIVINE', fatherPhone: '', motherPhone: '0723303077', materialsPaid: 0, feesPaid: 71000, balance: 30000, uniformPaid: 0, totalPaid: 71000 },
  { className: 'P3', name: 'UWASE SHAMI LELOU', fatherPhone: '0788266136', motherPhone: '0781411796', materialsPaid: 30000, feesPaid: 66000, balance: 5000, uniformPaid: 0, totalPaid: 96000 },
  { className: 'P3', name: 'IKUZWE ADELINE', fatherPhone: '0786069138', motherPhone: '0781662024', materialsPaid: 0, feesPaid: 50000, balance: 51000, uniformPaid: 0, totalPaid: 50000 },
  { className: 'P3', name: 'GICU VICKY LOGAN', fatherPhone: '0788601155', motherPhone: '0788959098', materialsPaid: 30000, feesPaid: 0, balance: 71000, uniformPaid: 0, totalPaid: 30000 },
  { className: 'P3', name: 'UWASE KARABO KAMI GAELL', fatherPhone: '0782020521', motherPhone: '0784318807', materialsPaid: 18000, feesPaid: 50000, balance: 33000, uniformPaid: 0, totalPaid: 68000 },
  { className: 'P3', name: 'WISHAVURA ANGEL', fatherPhone: '0782012080', motherPhone: '0787428143', materialsPaid: 0, feesPaid: 55000, balance: 46000, uniformPaid: 0, totalPaid: 55000 },
  { className: 'P3', name: 'UMUHIRE KEVIN', fatherPhone: '0788224601', motherPhone: '072506456', materialsPaid: 30000, feesPaid: 40000, balance: 31000, uniformPaid: 0, totalPaid: 70000 },
  { className: 'P3', name: 'NIYOGISUBIZO CHANCE', fatherPhone: '0788496601', motherPhone: '078309376', materialsPaid: 0, feesPaid: 71000, balance: 30000, uniformPaid: 0, totalPaid: 71000 },
  { className: 'P3', name: 'IRAKIZA JOY', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 30000, balance: 56000, uniformPaid: 0, totalPaid: 30000 },
  { className: 'P3', name: 'MUGABO LEVIS', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 33000, balance: 38000, uniformPaid: 32000, totalPaid: 95000 },

  // Primary 2 (P2)
  { className: 'P2', name: 'ISHIMWE CLEMENT', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 50000, balance: 41000, uniformPaid: 0, totalPaid: 50000 },
  { className: 'P2', name: 'ISHIMWE BLENDA', fatherPhone: '0788492308', motherPhone: '0784802376', materialsPaid: 0, feesPaid: 0, balance: 101000, uniformPaid: 0, totalPaid: 0 },
  { className: 'P2', name: 'UWISHIMWE ESTHER', fatherPhone: '0788273770', motherPhone: '0784034871', materialsPaid: 0, feesPaid: 30000, balance: 71000, uniformPaid: 0, totalPaid: 30000 },
  { className: 'P2', name: 'KEZA ANGE KHUCHI', fatherPhone: '0785579473', motherPhone: '0790535582', materialsPaid: 0, feesPaid: 60000, balance: 41000, uniformPaid: 3000, totalPaid: 63000 },
  { className: 'P2', name: 'GWIZA HABIMANA IRIS MIA', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 70000, balance: 1000, uniformPaid: 0, totalPaid: 100000 },
  { className: 'P2', name: 'SHEMA KING', fatherPhone: '0788582784', motherPhone: '0788617133', materialsPaid: 0, feesPaid: 25000, balance: 76000, uniformPaid: 0, totalPaid: 25000 },
  { className: 'P2', name: 'IRAKOZE NGABO GAEL', fatherPhone: '0782850909', motherPhone: '0786954987', materialsPaid: 0, feesPaid: 0, balance: 101000, uniformPaid: 0, totalPaid: 0 },
  { className: 'P2', name: 'IGIRANEZA RUTH', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 20000, balance: 71000, uniformPaid: 0, totalPaid: 20000 },
  { className: 'P2', name: 'IRAGANJE HIRWA KENNY', fatherPhone: '0788496601', motherPhone: '0783309376', materialsPaid: 8000, feesPaid: 71000, balance: 22000, uniformPaid: 0, totalPaid: 79000 },
  { className: 'P2', name: 'ISHIMWE OWEN KERAN', fatherPhone: '0786069138', motherPhone: '0781662024', materialsPaid: 0, feesPaid: 0, balance: 101000, uniformPaid: 0, totalPaid: 0 },
  { className: 'P2', name: 'INEZA AXCEL', fatherPhone: '0783716377', motherPhone: '078966840', materialsPaid: 30000, feesPaid: 0, balance: 71000, uniformPaid: 0, totalPaid: 30000 },

  // Primary 1 (P1)
  { className: 'P1', name: 'UMUHOZA SHAMI JEAN AIME', fatherPhone: '0725018366', motherPhone: '', materialsPaid: 30000, feesPaid: 5000, balance: 66000, uniformPaid: 0, totalPaid: 35000 },
  { className: 'P1', name: 'GANZA NOLLAN NSENGIYUMVA', fatherPhone: '0795354083', motherPhone: '0781205644', materialsPaid: 0, feesPaid: 40000, balance: 61000, uniformPaid: 13000, totalPaid: 53000 },
  { className: 'P1', name: 'INEZA HAPPY SHALLOM', fatherPhone: '0782573264', motherPhone: '0783367382', materialsPaid: 30000, feesPaid: 0, balance: 71000, uniformPaid: 30000, totalPaid: 60000 },
  { className: 'P1', name: 'AGAHOZO PRECIAS BRITINNY', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 71000, balance: 0, uniformPaid: 0, totalPaid: 101000 },
  { className: 'P1', name: 'UMUTONIWASE QUEEN NOELLA', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 60000, balance: 41000, uniformPaid: 0, totalPaid: 60000 },
  { className: 'P1', name: 'CYUBAHIRO GISA LOMEON', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 20000, balance: 51000, uniformPaid: 0, totalPaid: 50000 },
  { className: 'P1', name: 'MUGISHA GANZA INEZA HERTIER', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 25000, balance: 76000, uniformPaid: 0, totalPaid: 25000 },
  { className: 'P1', name: 'HIRWA ERCKISON', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 0, balance: 71000, uniformPaid: 0, totalPaid: 30000 },
  { className: 'P1', name: 'INEZA HIRWA SANDRA', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 57000, balance: 14000, uniformPaid: 32000, totalPaid: 119000 },
  { className: 'P1', name: 'IRAKIZA FAVOR', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 40000, balance: 50000, uniformPaid: 0, totalPaid: 40000 },
  { className: 'P1', name: 'IRAKOZE BLESSING IAN', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 40000, balance: 50000, uniformPaid: 0, totalPaid: 40000 },
  { className: 'P1', name: 'ASHIMWE LEY RAYAN', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 30000, balance: 71000, uniformPaid: 0, totalPaid: 30000 },
  { className: 'P1', name: 'IRASUBIZA ENOVA MIRACLES', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 66000, balance: 5000, uniformPaid: 0, totalPaid: 96000 },
  { className: 'P1', name: 'IZIBYOSE AIME JEAN DE DIEU', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 81000, balance: 0, uniformPaid: 0, totalPaid: 81000 },
  { className: 'P1', name: 'IMPANO BLESSING', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 30000, balance: 44000, uniformPaid: 0, totalPaid: 30000 },
  { className: 'P1', name: 'MUGISHA GIFT GLORIA', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 20000, balance: 51000, uniformPaid: 0, totalPaid: 50000 },
  { className: 'P1', name: 'IRABISOHOJE DYLAN MUGISHA KABAKA', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 33000, balance: 68000, uniformPaid: 18000, totalPaid: 51000 },
  { className: 'P1', name: 'NIKUZE ELLA JOVIA', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 0, balance: 78000, uniformPaid: 0, totalPaid: 0 },
  { className: 'P1', name: 'ABIZEYIMANA CHANCELINE', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 20000, balance: 51000, uniformPaid: 0, totalPaid: 50000 },
  { className: 'P1', name: 'NIYONKURU OLGA', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 0, balance: 101000, uniformPaid: 10000, totalPaid: 10000 },
  { className: 'P1', name: 'GIKUNDIRO SHAMI JOSEPH', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 20000, balance: 71000, uniformPaid: 0, totalPaid: 20000 },
  { className: 'P1', name: 'SHAMI JEAN AIME MUHOZA', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 5000, balance: 66000, uniformPaid: 10000, totalPaid: 45000 },
  { className: 'P1', name: 'SEZERANO LOUIS BLAISE', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 50000, balance: 41000, uniformPaid: 20000, totalPaid: 70000 },
  { className: 'P1', name: 'UWIZEYIMANA MUGISHA GAELLE', fatherPhone: '', motherPhone: '0728871723', materialsPaid: 0, feesPaid: 0, balance: 86000, uniformPaid: 15000, totalPaid: 15000 },
  { className: 'P1', name: 'UWACU KUNDWA JESSY MEGHAN', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 38000, balance: 33000, uniformPaid: 32000, totalPaid: 100000 },
  { className: 'P1', name: 'IRANKUNDA SHAMI CHANELA', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 0, balance: 101000, uniformPaid: 16000, totalPaid: 16000 },

  // Top Class (N3)
  { className: 'N3', name: 'MUTUYIMANA AKARABO KEZA DAELLA', fatherPhone: '0783409714', motherPhone: '0780737981', materialsPaid: 30000, feesPaid: 51000, balance: 17000, uniformPaid: 32000, totalPaid: 113000 },
  { className: 'N3', name: 'GANZE IYAN', fatherPhone: '0782834312', motherPhone: '0798356301', materialsPaid: 30000, feesPaid: 0, balance: 68000, uniformPaid: 23000, totalPaid: 53000 },
  { className: 'N3', name: 'RINGUYENEZA SEIF AL - DIN', fatherPhone: '0794917827', motherPhone: '', materialsPaid: 30000, feesPaid: 31000, balance: 37000, uniformPaid: 32000, totalPaid: 93000 },
  { className: 'N3', name: 'MUGISHA LIONEL', fatherPhone: '0787065963', motherPhone: '', materialsPaid: 0, feesPaid: 40000, balance: 43000, uniformPaid: 15000, totalPaid: 55000 },
  { className: 'N3', name: 'IRASUBIZA AIME MANDELLA', fatherPhone: '0789030961', motherPhone: '0785440966', materialsPaid: 30000, feesPaid: 5000, balance: 63000, uniformPaid: 0, totalPaid: 35000 },
  { className: 'N3', name: 'SHAMI MIGUEL FRED', fatherPhone: '0783811152', motherPhone: '0783491275', materialsPaid: 30000, feesPaid: 0, balance: 68000, uniformPaid: 20000, totalPaid: 50000 },
  { className: 'N3', name: 'NSHIMIIMANA LUCAS DIAZ', fatherPhone: '0784007233', motherPhone: '0780829845', materialsPaid: 0, feesPaid: 0, balance: 98000, uniformPaid: 0, totalPaid: 0 },
  { className: 'N3', name: 'NSANZUMUHIRE DERCY', fatherPhone: '0788462951', motherPhone: '0780928962', materialsPaid: 0, feesPaid: 0, balance: 98000, uniformPaid: 0, totalPaid: 0 },
  { className: 'N3', name: 'IRANKUNDA FRANK', fatherPhone: '0722240502', motherPhone: '0726588557', materialsPaid: 30000, feesPaid: 69000, balance: -1000, uniformPaid: 10000, totalPaid: 109000 },
  { className: 'N3', name: 'HIRWA SHAMI PHILIPE', fatherPhone: '0788859804', motherPhone: '0782375421', materialsPaid: 30000, feesPaid: 108000, balance: -40000, uniformPaid: 0, totalPaid: 138000 },
  { className: 'N3', name: 'UWAYO DIVIN', fatherPhone: '0787174806', motherPhone: '0789431841', materialsPaid: 30000, feesPaid: 108000, balance: -40000, uniformPaid: 0, totalPaid: 138000 },
  { className: 'N3', name: 'TUNEZERWE IRINATWE BRAYAN', fatherPhone: '0783995709', motherPhone: '0782618662', materialsPaid: 0, feesPaid: 50000, balance: 38000, uniformPaid: 0, totalPaid: 50000 },
  { className: 'N3', name: 'UMUNEZERO ISHEJA BRIANA', fatherPhone: '0789480247', motherPhone: '0787986565', materialsPaid: 0, feesPaid: 0, balance: 98000, uniformPaid: 0, totalPaid: 0 },
  { className: 'N3', name: 'KEZA FAITH GIA', fatherPhone: '0785377922', motherPhone: '0784213775', materialsPaid: 0, feesPaid: 0, balance: 78000, uniformPaid: 10000, totalPaid: 10000 },
  { className: 'N3', name: 'NDAYISHIMIYE ALAIN MARIUS', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 25000, balance: 63000, uniformPaid: 0, totalPaid: 25000 },
  { className: 'N3', name: 'UTUJE YVES', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 28000, balance: 40000, uniformPaid: 32000, totalPaid: 90000 },
  { className: 'N3', name: 'SEZERANO BIGWI NICOLAS', fatherPhone: '0728252008', motherPhone: '0724038262', materialsPaid: 0, feesPaid: 0, balance: 132000, uniformPaid: 10000, totalPaid: 10000 },
  { className: 'N3', name: 'IRIZA ANE HOPE', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 0, balance: 98000, uniformPaid: 10000, totalPaid: 10000 },
  { className: 'N3', name: 'MIGAMBI TRESOR', fatherPhone: '', motherPhone: '', materialsPaid: 0, feesPaid: 70000, balance: 18000, uniformPaid: 0, totalPaid: 70000 },
  { className: 'N3', name: 'NDACYAYISENGA SHEMA JUNIOR', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 0, balance: 68000, uniformPaid: 0, totalPaid: 30000 },
  { className: 'N3', name: 'MUVUNYI KESSIA PRETY', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 0, balance: 68000, uniformPaid: 0, totalPaid: 30000 },
  { className: 'N3', name: 'AGANZE IAN ENULIQUE', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 28000, balance: 40000, uniformPaid: 32000, totalPaid: 90000 },

  // Middle Class (N2)
  { className: 'N2', name: 'AKUZWE LUNA NICOLE', fatherPhone: '0780199129', motherPhone: '0786207768', materialsPaid: 30000, feesPaid: 13000, balance: 55000, uniformPaid: 32000, totalPaid: 75000 },
  { className: 'N2', name: 'CYUSA OWEN EMMY', fatherPhone: '07846714227', motherPhone: '0787440836', materialsPaid: 30000, feesPaid: 38000, balance: 30000, uniformPaid: 32000, totalPaid: 100000 },
  { className: 'N2', name: 'INEZA DANIELLA', fatherPhone: '0782853135', motherPhone: '078066908', materialsPaid: 30000, feesPaid: 31000, balance: 37000, uniformPaid: 32000, totalPaid: 93000 },
  { className: 'N2', name: 'MUSHAMBO ASSAN ASIFA', fatherPhone: '0788822524', motherPhone: '0795723310', materialsPaid: 30000, feesPaid: 18000, balance: 50000, uniformPaid: 32000, totalPaid: 80000 },
  { className: 'N2', name: 'HIRWA SHAMI HERO', fatherPhone: '0788883317', motherPhone: '0788248448', materialsPaid: 30000, feesPaid: 0, balance: 68000, uniformPaid: 23000, totalPaid: 53000 },
  { className: 'N2', name: 'INEZA KUNDWA AVILLA', fatherPhone: '0788202954', motherPhone: '0788714590', materialsPaid: 30000, feesPaid: 68000, balance: 0, uniformPaid: 32000, totalPaid: 130000 },
  { className: 'N2', name: 'MFURA RANGIRA GUYANE', fatherPhone: '', motherPhone: '0782470357', materialsPaid: 0, feesPaid: 0, balance: 98000, uniformPaid: 0, totalPaid: 0 },
  { className: 'N2', name: 'GABIRO LUCKY DIOR', fatherPhone: '0788601155', motherPhone: '0788959098', materialsPaid: 30000, feesPaid: 0, balance: 68000, uniformPaid: 0, totalPaid: 30000 },
  { className: 'N2', name: 'TETA SHILO KUNWDA ANAYA', fatherPhone: '', motherPhone: '0781963965', materialsPaid: 30000, feesPaid: 30000, balance: 38000, uniformPaid: 0, totalPaid: 60000 },
  { className: 'N2', name: 'BEN LIGHT CLOADIA', fatherPhone: '0780768944', motherPhone: '0787562953', materialsPaid: 30000, feesPaid: 61000, balance: 0, uniformPaid: 0, totalPaid: 91000 },
  { className: 'N2', name: 'NTABWOBA SEZERANO KEILLA', fatherPhone: '0783407117', motherPhone: '0783320216', materialsPaid: 0, feesPaid: 71000, balance: 17000, uniformPaid: 0, totalPaid: 71000 },
  { className: 'N2', name: 'RUBERANGEYO IHIRWE GAELLA', fatherPhone: '0788453034', motherPhone: '0783031666', materialsPaid: 0, feesPaid: 45000, balance: 33000, uniformPaid: 0, totalPaid: 45000 },
  { className: 'N2', name: 'IRAKOZE DESTINE', fatherPhone: '0787113841', motherPhone: '0793226045', materialsPaid: 30000, feesPaid: 18000, balance: 50000, uniformPaid: 32000, totalPaid: 80000 },
  { className: 'N2', name: 'TUYISENGE GANZA BRAYAN', fatherPhone: '0783089006', motherPhone: '0785886009', materialsPaid: 0, feesPaid: 65000, balance: 23000, uniformPaid: 0, totalPaid: 65000 },
  { className: 'N2', name: 'GISA LEE LOGAN', fatherPhone: '0788654465', motherPhone: '0780621905', materialsPaid: 30000, feesPaid: 50000, balance: 18000, uniformPaid: 0, totalPaid: 80000 },
  { className: 'N2', name: 'INEZAYIMANA ANGE', fatherPhone: '0785501935', motherPhone: '0788397585', materialsPaid: 0, feesPaid: 37000, balance: 51000, uniformPaid: 0, totalPaid: 37000 },
  { className: 'N2', name: 'IRAKOZE ALLIANCE LAVINIA', fatherPhone: '0788266136', motherPhone: '0781411796', materialsPaid: 30000, feesPaid: 63000, balance: 0, uniformPaid: 0, totalPaid: 93000 },
  { className: 'N2', name: 'SHIMWA JEHOVANIS RAYAN', fatherPhone: '0788820848', motherPhone: '0787987475', materialsPaid: 0, feesPaid: 25000, balance: 65000, uniformPaid: 0, totalPaid: 25000 },
  { className: 'N2', name: 'NDAGIJIMANA IRASUBIZA NICOLAS', fatherPhone: '0780453478', motherPhone: '0789281505', materialsPaid: 30000, feesPaid: 20000, balance: 48000, uniformPaid: 0, totalPaid: 50000 },
  { className: 'N2', name: 'HIRWA SACHA MOGHAN', fatherPhone: '0785149838', motherPhone: '0780555220', materialsPaid: 0, feesPaid: 0, balance: 98000, uniformPaid: 0, totalPaid: 0 },
  { className: 'N2', name: 'IKUZO BRIELLA', fatherPhone: '0783716377', motherPhone: '078966840', materialsPaid: 30000, feesPaid: 69000, balance: -1000, uniformPaid: 0, totalPaid: 99000 },
  { className: 'N2', name: 'NIYOMUNEZERO SAMUEL', fatherPhone: '0788527584', motherPhone: '0783661438', materialsPaid: 30000, feesPaid: 0, balance: 68000, uniformPaid: 26000, totalPaid: 56000 },
  { className: 'N2', name: 'IRISA JESCA', fatherPhone: '', motherPhone: '0781662024', materialsPaid: 0, feesPaid: 50000, balance: 38000, uniformPaid: 0, totalPaid: 50000 },
  { className: 'N2', name: 'IRANEZEZA MPANO BRAYAN', fatherPhone: '', motherPhone: '', materialsPaid: 30000, feesPaid: 48000, balance: 20000, uniformPaid: 32000, totalPaid: 110000 },
  { className: 'N2', name: 'GALICIA RAMBA ELIO', fatherPhone: '0782398143', motherPhone: '0784800767', materialsPaid: 30000, feesPaid: 11000, balance: 57000, uniformPaid: 32000, totalPaid: 73000 },

  // Baby Class (N1)
  { className: 'N1', name: 'IGIHOZO B. BRIELLA', fatherPhone: '0782226877', motherPhone: '0785502845', materialsPaid: 30000, feesPaid: 5000, balance: 95000, uniformPaid: 0, totalPaid: 35000 },
  { className: 'N1', name: 'GANZA LOGAN DYLAN', fatherPhone: '0782226877', motherPhone: '0785502845', materialsPaid: 30000, feesPaid: 25000, balance: 43000, uniformPaid: 32000, totalPaid: 87000 },
  { className: 'N1', name: 'IHIRWE MILLA NSENGIYUMVA', fatherPhone: '0795354083', motherPhone: '0781205644', materialsPaid: 30000, feesPaid: 0, balance: 77000, uniformPaid: 23000, totalPaid: 53000 },
  { className: 'N1', name: 'AGWIZE KABERA AGASARO MIA', fatherPhone: '0781870635', motherPhone: '0784438190', materialsPaid: 30000, feesPaid: 1000, balance: 67000, uniformPaid: 32000, totalPaid: 63000 },
  { className: 'N1', name: "NIYONGIRA JEAN D'AMOUR", fatherPhone: '0780529292', motherPhone: '', materialsPaid: 30000, feesPaid: 56000, balance: 12000, uniformPaid: 32000, totalPaid: 118000 },
  { className: 'N1', name: 'NDAGIJIMANA IRAKOZE NICOLE', fatherPhone: '0780453478', motherPhone: '0789281505', materialsPaid: 30000, feesPaid: 43000, balance: 25000, uniformPaid: 32000, totalPaid: 105000 },
  { className: 'N1', name: 'NSANZINEZA LUCK BERTLA', fatherPhone: '0783150412', motherPhone: '0780578399', materialsPaid: 30000, feesPaid: 0, balance: 85000, uniformPaid: 15000, totalPaid: 45000 },
  { className: 'N1', name: 'KUNDWA ANDY MALO', fatherPhone: '0783358483', motherPhone: '0780480102', materialsPaid: 0, feesPaid: 0, balance: 117000, uniformPaid: 13000, totalPaid: 13000 },
  { className: 'N1', name: 'INEZA INGABIRE JESCA', fatherPhone: '0787931442', motherPhone: '0780712571', materialsPaid: 30000, feesPaid: 61000, balance: 7000, uniformPaid: 32000, totalPaid: 123000 },
  { className: 'N1', name: 'ISHIMWE KEVIN LODRIGO', fatherPhone: '0793695650', motherPhone: '0786237589', materialsPaid: 30000, feesPaid: 52000, balance: 16000, uniformPaid: 32000, totalPaid: 114000 },
  { className: 'N1', name: 'ABIZERA ELLA GIANA', fatherPhone: '0783607685', motherPhone: '0781163867', materialsPaid: 30000, feesPaid: 0, balance: 70000, uniformPaid: 30000, totalPaid: 60000 },
  { className: 'N1', name: 'INEZAYIMANA MILLA GABRIELLA', fatherPhone: '0789152980', motherPhone: '0798918340', materialsPaid: 30000, feesPaid: 75000, balance: -7000, uniformPaid: 32000, totalPaid: 137000 },
  { className: 'N1', name: 'UWIGISUBIZO OLGA JOYCE', fatherPhone: '0789648423', motherPhone: '0795963771', materialsPaid: 30000, feesPaid: 13000, balance: 55000, uniformPaid: 32000, totalPaid: 75000 },
  { className: 'N1', name: 'NGANJI DERCY ASHER KENDRICK', fatherPhone: '0789285411', motherPhone: '0789213464', materialsPaid: 30000, feesPaid: 71000, balance: -3000, uniformPaid: 32000, totalPaid: 133000 },
  { className: 'N1', name: 'KAYIHURA TUYISENGE MOGHAN', fatherPhone: '0788449518', motherPhone: '0783372129', materialsPaid: 30000, feesPaid: 0, balance: 100000, uniformPaid: 0, totalPaid: 30000 },
  { className: 'N1', name: 'UMWALI UWASE KETIA', fatherPhone: '0784149632', motherPhone: '0722822848', materialsPaid: 30000, feesPaid: 0, balance: 97000, uniformPaid: 3000, totalPaid: 33000 },
  { className: 'N1', name: 'ISHIMWE LOUANGE TRECY', fatherPhone: '0785494534', motherPhone: '0780545083', materialsPaid: 30000, feesPaid: 66000, balance: 2000, uniformPaid: 32000, totalPaid: 128000 },
  { className: 'N1', name: 'ISHAMI RUGWIRO NORA ELLA', fatherPhone: '0783607685', motherPhone: '0781163867', materialsPaid: 30000, feesPaid: 0, balance: 70000, uniformPaid: 30000, totalPaid: 60000 },
  { className: 'N1', name: 'AGANZE HAPPY MERCI DAVINA', fatherPhone: '0788472180', motherPhone: '0722682080', materialsPaid: 30000, feesPaid: 0, balance: 80000, uniformPaid: 20000, totalPaid: 50000 },
  { className: 'N1', name: 'AHIRWE MUGABO JUNIOR', fatherPhone: '0785384180', motherPhone: '0781416732', materialsPaid: 30000, feesPaid: 8000, balance: 60000, uniformPaid: 32000, totalPaid: 70000 },
  { className: 'N1', name: 'IRAKOZE Beyonce', fatherPhone: '0784260889', motherPhone: '0788275974', materialsPaid: 30000, feesPaid: 0, balance: 68000, uniformPaid: 32000, totalPaid: 62000 },
];

// ============================================================================
// HELPERS
// ============================================================================
const FEMALE_TOKENS = new Set([
  'MARIE', 'CLAUDETTE', 'CHANCELINE', 'PRECIAS', 'BRITINNY', 'GAELLE', 'GAELL', 'GAELLA',
  'ESTHER', 'ESTER', 'OLGA', 'JOICE', 'JOYCE', 'DAELLA', 'DAELA', 'SANDRA', 'BLENDA',
  'KESSIA', 'ORNELLA', 'ORNELL', 'NEILLA', 'NEILA', 'JESSCA', 'JESCA', 'JESSY', 'SABINE',
  'NOELLA', 'QUEEN', 'CHANELA', 'AVILLA', 'LUNA', 'NICOLE', 'DANIELLA', 'CLOADIA',
  'KEILLA', 'LAVINIA', 'BRIELLA', 'GIA', 'HOPE', 'BRIANA', 'ISABELLE', 'EMMANUELLA',
  'KEZA', 'ADELINE', 'VICKY', 'ANGEL', 'RUTH', 'IRIS', 'MIA', 'GLORIA', 'JOVIA',
  'MEGHAN', 'INEZA', 'SHALLOM', 'LELOU', 'BEYONCE', 'DAVINA', 'KETIA', 'ELLA', 'NORA',
  'TRECY', 'LOUANGE', 'ASHA', 'DERCY', 'JOY', 'GUYANE', 'GIANA', 'ANAYA', 'TETA',
  'PRETY', 'UWASE', 'BERTLA',
]);

function nameParts(full) {
  const parts = String(full || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || firstName;
  return { firstName, lastName };
}

function nameTokens(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/[’']/g, '')
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length > 1);
}

function inferGender(name) {
  for (const token of nameTokens(name)) {
    if (FEMALE_TOKENS.has(token)) return 'FEMALE';
  }
  return 'MALE';
}

function normalizeKey(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function tokenEq(a, b) {
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 5 && levenshtein(a, b) <= 1;
}

function matchScore(aTokens, bTokens) {
  const pool = [...bTokens];
  let matched = 0;
  for (const t of aTokens) {
    const idx = pool.findIndex((p) => tokenEq(t, p));
    if (idx >= 0) {
      matched++;
      pool.splice(idx, 1);
    }
  }
  return matched / Math.max(aTokens.length, bTokens.length, 1);
}

// Finds the roster record a payment-sheet name belongs to (or null).
function findRecord(rawName, classHint, rosterIndex) {
  const key = normalizeKey(rawName);
  const alias = NAME_ALIASES[key];
  if (alias === '__UNMATCHED__') return null;
  const lookupName = alias || rawName;
  const lookupKey = normalizeKey(lookupName);

  let pool = rosterIndex;
  if (classHint && CLASS_FEES[classHint]) {
    const inClass = rosterIndex.filter((r) => r.className === classHint);
    if (inClass.length) pool = inClass;
  }

  const exact = pool.filter((r) => r._key === lookupKey);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return exact[0];
  if (alias) {
    const any = rosterIndex.find((r) => r._key === lookupKey);
    if (any) return any;
  }

  const tokens = nameTokens(lookupName);
  const scored = pool
    .map((r) => ({ r, score: matchScore(tokens, r._tokens) }))
    .filter((x) => x.score >= 0.6)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  if (scored.length > 1 && scored[1].score === scored[0].score) return null;
  return scored[0].r;
}

// Splits a student's real transactions across MATERIALS -> SCHOOL_FEES ->
// UNIFORM so each Payment row carries a true date / channel. Whatever the
// class sheet says was paid but no transaction explains is recorded using the
// summary-list channel (or CASH) on a default date, so per-student totals
// always equal the class sheets.
function allocatePayments(record, txns, channel, defaultDates) {
  const queue = [...txns]
    .sort((a, b) => a.date - b.date)
    .map((t) => ({ ...t, left: t.amount }));
  const out = [];
  const needs = [
    ['MATERIALS', record.materialsPaid],
    ['SCHOOL_FEES', record.feesPaid],
    ['UNIFORM', record.uniformPaid],
  ];
  for (const [feeType, total] of needs) {
    let need = total || 0;
    for (const q of queue) {
      if (need <= 0) break;
      if (q.left <= 0) continue;
      const take = Math.min(q.left, need);
      out.push({ feeType, amount: take, method: q.method, date: q.date, payer: q.payer });
      q.left -= take;
      need -= take;
    }
    if (need > 0) {
      out.push({
        feeType,
        amount: need,
        method: channel?.method || 'CASH',
        date: defaultDates[feeType],
        payer: channel?.payer || '',
      });
    }
  }
  return out;
}

// Applies report payments on top of what the class sheet already shows as paid.
// Clears outstanding MATERIALS first, then SCHOOL_FEES; any surplus stays on
// SCHOOL_FEES (advance payment). `overpaid` is returned so the seed can report it.
function allocateReportPayments(record, txns) {
  const fees = CLASS_FEES[record.className];
  let matDue = Math.max(0, fees.materials - (record.materialsPaid || 0));
  let feeDue = Math.max(0, fees.school - (record.feesPaid || 0));
  const out = [];
  let overpaid = 0;
  for (const t of [...txns].sort((a, b) => a.date - b.date)) {
    let left = t.amount;
    const push = (feeType, amount) => {
      if (amount > 0) out.push({ feeType, amount, method: t.method, date: t.date, payer: t.payer });
    };
    if (!SPLIT_NEW_PAYMENTS) {
      push('SCHOOL_FEES', left);
      continue;
    }
    const m = Math.min(left, matDue);
    push('MATERIALS', m);
    left -= m;
    matDue -= m;
    const f = Math.min(left, feeDue);
    push('SCHOOL_FEES', f);
    left -= f;
    feeDue -= f;
    push('SCHOOL_FEES', left);
    overpaid += left;
  }
  return { plan: out, overpaid };
}

function payerLabel(payer) {
  return String(payer || '').split('(')[0].trim();
}

// ============================================================================
// SEED
// ============================================================================
// This seed is ADDITIVE and safe to run on a live database. It never drops a
// collection and never overwrites records that already exist:
//   - users, classes, academic year, fee structures/items, uniform items +
//     their stock ledger, inventory and settings are only created when missing;
//   - the full student / payment history is loaded only when the database has
//     no students yet.
// Run `npm run seed` as often as you like: existing data is preserved and only
// missing defaults (e.g. new uniform items) are added.
async function run() {
  if (!config.mongoUri) {
    console.error('MONGODB_URI is required to seed the database');
    process.exit(1);
  }
  await mongoose.connect(config.mongoUri);
  console.log('[seed] Connected to MongoDB');
  console.log(`[seed] Seeding "${mongoose.connection.name}" additively (existing data is preserved)`);

  // STEP 1: SYSTEM USERS — only the accounts that do not exist yet are created.
  let admin = null;
  for (const u of SYSTEM_USERS) {
    const existing = await User.findOne({ username: u.username.toLowerCase() });
    if (existing) {
      console.log(`[seed] kept existing ${u.role} -> ${u.email}`);
      if (u.role === 'SUPER_ADMIN') admin = existing;
      continue;
    }
    const created = await User.create(u);
    if (u.role === 'SUPER_ADMIN') admin = created;
    console.log(`[seed] created ${u.role} -> ${u.email}`);
  }
  if (!admin) admin = (await User.findOne({ role: 'SUPER_ADMIN' })) || (await User.findOne({}));
  if (!admin) {
    console.error('[seed] No user available to attribute stock movements to');
    process.exit(1);
  }

  // STEP 2: CLASSES & ACADEMIC YEAR
  const classIds = {};
  let order = 1;
  for (const name of Object.keys(CLASS_FEES)) {
    let cls = await SchoolClass.findOne({ name });
    if (!cls) {
      cls = await SchoolClass.create({
        name,
        level: name.startsWith('N') ? 'NURSERY' : 'PRIMARY',
        order,
      });
      console.log(`[seed] created class ${name}`);
    }
    classIds[name] = cls._id;
    order++;
  }
  console.log('[seed] School classes ready');

  let year = await AcademicYear.findOne({ name: '2026-2027' });
  if (!year) {
    year = await AcademicYear.create({
      name: '2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-08-31'),
      isActive: true,
      terms: [
        { name: 'Term 1', startDate: new Date('2026-09-01'), endDate: new Date('2026-12-18'), status: 'ACTIVE' },
        { name: 'Term 2', startDate: new Date('2027-01-06'), endDate: new Date('2027-04-02') },
        { name: 'Term 3', startDate: new Date('2027-04-19'), endDate: new Date('2027-07-10') },
      ],
    });
    console.log('[seed] Academic year 2026-2027 created');
  } else {
    console.log('[seed] Academic year 2026-2027 already exists (kept as is)');
  }

  // STEP 3: FEE STRUCTURES & ITEMS — existing rows are left untouched.
  let structuresAdded = 0;
  for (const term of ['Term 1', 'Term 2', 'Term 3']) {
    for (const [name, fees] of Object.entries(CLASS_FEES)) {
      const entries = [
        ['SCHOOL_FEES', fees.school],
        ['MATERIALS', fees.materials],
        ['UNIFORM', fees.uniform],
      ];
      for (const [feeType, amount] of entries) {
        const res = await FeeStructure.updateOne(
          { academicYear: year._id, term, class: classIds[name], feeType },
          { $setOnInsert: { requiredAmount: amount, status: 'ACTIVE' } },
          { upsert: true }
        );
        if (res.upsertedCount) structuresAdded++;
      }
    }
  }
  console.log(`[seed] Fee structures: ${structuresAdded} added, existing ones kept`);

  let itemsAdded = 0;
  const ensureFeeItem = async (doc) => {
    const exists = await FeeItem.findOne({ category: doc.category, name: doc.name });
    if (exists) return;
    await FeeItem.create(doc);
    itemsAdded++;
  };
  for (const m of MATERIALS) {
    await ensureFeeItem({ category: 'MATERIAL', name: m.name, price: m.price, order: 1 });
  }
  for (const m of MATERIALS_P45) {
    await ensureFeeItem({
      category: 'MATERIAL',
      name: `${m.name} (P4/P5)`,
      price: m.price,
      classes: [classIds.P4, classIds.P5],
      order: 1,
    });
  }
  for (const [i, u] of UNIFORM_FEE_ITEMS.entries()) {
    await ensureFeeItem({ category: 'UNIFORM', name: u.name, price: u.price, order: i + 1 });
  }
  console.log(`[seed] Fee items: ${itemsAdded} added, existing ones kept`);

  // STEP 5: UNIFORM STOCK (dated deliveries per the 08/10/2026 report)
  // Sales are written in STEP 9, split per student from the Word list.
  const stockState = new Map();
  let uniformItemsAdded = 0;
  for (const [idx, s] of UNIFORM_STOCK.entries()) {
    const quantityIssued = s.sold + s.returned;
    if (s.received - quantityIssued !== s.inStock) {
      console.warn(`[seed] WARNING stock mismatch for ${s.name}: ${s.received} - ${quantityIssued} != ${s.inStock}`);
    }
    const found = await UniformItem.findOne({ name: s.name, size: 'FREE', gender: 'UNISEX' });
    if (found) {
      console.log(`[seed] kept existing uniform item ${s.name}`);
      continue;
    }
    const item = await UniformItem.create({
      name: s.name,
      gender: 'UNISEX',
      size: 'FREE',
      price: s.price,
      quantityReceived: s.received,
      quantityIssued,
      minimumStockLevel: 5,
      unitCost: Math.round(s.price * 0.6),
      status: 'ACTIVE',
    });

    const deliveries = STOCK_DELIVERIES
      .map((d) => ({ date: d.date, label: d.label || 'Delivery', qty: d.qty[idx] }))
      .filter((d) => d.qty > 0);
    const dated = deliveries.reduce((sum, d) => sum + d.qty, 0);
    if (dated < s.received) {
      deliveries.push({
        date: '2026-10-08',
        label: 'Reconciliation to report total',
        qty: s.received - dated,
      });
    }

    // Movements in order: dated deliveries, then (dated at the report date)
    // sales and the items sent back to the supplier. Running balance ends at
    // the "in stock" figure of the report.
    const REPORT_DATE = '2026-10-08';
    const movements = deliveries.map((d) => ({
      type: 'RECEIVED',
      qty: d.qty,
      sign: 1,
      date: d.date,
      reason: `${d.label} - L.P.A Rulindo stock report`,
    }));
    if (s.returned > 0) {
      // "Imyenda yasubiyeyo": taken out of stock (stock goes DOWN), so it is
      // stored as ADJUSTMENT rather than RETURNED to avoid being read as +stock.
      movements.push({
        type: 'ADJUSTMENT',
        qty: s.returned,
        sign: -1,
        date: REPORT_DATE,
        reason: 'Returned out of stock (IMYENDA YASUBIYEYO) - L.P.A Rulindo stock report',
      });
    }

    let running = 0;
    for (const m of movements) {
      running += m.sign * m.qty;
      await UniformStockTransaction.create({
        uniformItem: item._id,
        type: m.type,
        quantity: m.qty,
        balanceAfter: running,
        date: new Date(m.date),
        reason: `Seed: ${m.reason}`,
        performedBy: admin._id,
      });
    }
    stockState.set(s.name, { item, running, sold: s.sold, inStock: s.inStock });
    uniformItemsAdded++;
  }
  console.log(`[seed] Uniform stock: ${uniformItemsAdded} item(s) added with their ledger, existing ones kept`);

  // STEP 6: OTHER INVENTORY & SETTINGS
  const INVENTORY_ITEMS = [
    { name: 'Kawunga', category: 'FOOD', unit: 'Bags', openingStock: 10, currentStock: 10, minimumStockLevel: 5, unitCost: 12000 },
    { name: 'Exercise Books', category: 'SCHOOL_BOOKS', unit: 'Pieces', openingStock: 500, currentStock: 500, minimumStockLevel: 100, unitCost: 300 },
    { name: 'Pens', category: 'STATIONERY', unit: 'Pieces', openingStock: 1000, currentStock: 1000, minimumStockLevel: 200, unitCost: 100 },
    { name: 'Chalk', category: 'OTHER', unit: 'Boxes', openingStock: 40, currentStock: 40, minimumStockLevel: 10, unitCost: 2500 },
  ];
  let inventoryAdded = 0;
  for (const inv of INVENTORY_ITEMS) {
    const exists = await InventoryItem.findOne({ name: inv.name });
    if (exists) continue;
    await InventoryItem.create(inv);
    inventoryAdded++;
  }
  console.log(`[seed] Inventory items: ${inventoryAdded} added, existing ones kept`);

  const defaults = {
    school_name: 'L.P.A RULINDO',
    school_address: 'Rulindo, Northern Province, Rwanda',
    school_phone: '+250 788 000 000',
    school_email: 'info@lparulindo.ac.rw',
    currency: 'RWF',
    receipt_prefix: 'RCT',
    school_logo: '',
    // Every student who eats at school owes this extra charge per term.
    meal_fee_per_term: 40000,
  };
  let settingsAdded = 0;
  for (const [key, value] of Object.entries(defaults)) {
    const existing = await Setting.findOne({ key });
    if (existing) continue;
    await Setting.set(key, value);
    settingsAdded++;
  }
  console.log(`[seed] System settings: ${settingsAdded} added, existing ones kept`);

  // The full student / payment / uniform-sales history is loaded only when the
  // database has no students yet, so re-running the seed never duplicates it.
  const hasStudents = (await Student.countDocuments()) > 0;
  if (hasStudents) {
    console.log('[seed] Students already present - skipping student, payment and uniform-sales history');
  } else {
    // STEP 7: STUDENTS + PAYMENTS
    const DEFAULT_DATES = {
      MATERIALS: new Date('2026-09-03'),
      SCHOOL_FEES: new Date('2026-09-07'),
      UNIFORM: new Date('2026-09-30'),
    };

    const rosterIndex = CLASS_ROSTERS.map((r) => ({
      ...r,
      _key: normalizeKey(r.name),
      _tokens: nameTokens(r.name),
    }));

    const txnsByRecord = new Map();
    const addTxn = (record, txn) => {
      if (!txnsByRecord.has(record)) txnsByRecord.set(record, []);
      txnsByRecord.get(record).push(txn);
    };
    const unmatched = [];

    for (const p of MOMO_PAYMENTS) {
      const record = findRecord(p.studentName, '', rosterIndex);
      if (!record) {
        unmatched.push(`MoMo ${p.date} ${p.studentName} ${p.amount}`);
        continue;
      }
      addTxn(record, {
        method: CHANNEL_METHOD.CODE, // incl. cash deposits listed on the MoMo sheet (reported under CODE)
        date: new Date(p.date),
        amount: p.amount,
        payer: payerLabel(p.payerName),
      });
    }
    for (const p of EQUITY_PAYMENTS) {
      const record = findRecord(p.studentName, p.className, rosterIndex);
      if (!record) {
        unmatched.push(`Equity ${p.date} ${p.studentName} ${p.amount}`);
        continue;
      }
      addTxn(record, { method: 'BANK', date: new Date(p.date), amount: p.amount, payer: '' });
    }

    const reportByRecord = new Map();
    let reportTotal = 0;
    for (const p of REPORT_PAYMENTS) {
      const record = findRecord(p.studentName, p.className, rosterIndex);
      if (!record) {
        unmatched.push(`Report ${p.date} ${p.studentName} ${p.amount} (not in any class sheet)`);
        continue;
      }
      if (!reportByRecord.has(record)) reportByRecord.set(record, []);
      reportByRecord.get(record).push({
        method: CHANNEL_METHOD[p.channel],
        date: new Date(p.date),
        amount: p.amount,
        payer: 'Daily report',
      });
      reportTotal += p.amount;
    }
    const overpaidList = [];

    const channelByRecord = new Map();
    for (const c of PAYMENT_CHANNELS) {
      const record = findRecord(c.name, c.className, rosterIndex);
      if (record) channelByRecord.set(record, c);
      else unmatched.push(`Channel list ${c.name}`);
    }

    // School feeding: who eats at school, plus their MEALS payments.
    const mealByRecord = new Map();
    for (const m of MEAL_FEEDING_LIST) {
      const record = findRecord(m.rosterName, m.className, rosterIndex);
      if (!record) {
        unmatched.push(`Meal list ${m.rosterName}`);
        continue;
      }
      mealByRecord.set(record, m);
    }

    const studentByRecord = new Map();
    const receiptPrefix = await Setting.get('receipt_prefix', 'RCT');
    const uniformPayments = [];
    let paymentCount = 0;
    let mealCount = 0;
    let mealTotal = 0;

    for (const record of rosterIndex) {
      const { firstName, lastName } = nameParts(record.name);
      const student = await Student.create({
        studentId: `STU-2026-${pad(await nextSequence('student'), 4)}`,
        firstName,
        lastName,
        gender: inferGender(record.name),
        class: classIds[record.className],
        academicYear: year._id,
        term: 'Term 1',
        fatherPhone: record.fatherPhone || '',
        motherPhone: record.motherPhone || '',
        status: 'ACTIVE',
        eatsAtSchool: mealByRecord.has(record),
      });
      studentByRecord.set(record, student);

      const plan = allocatePayments(
        record,
        txnsByRecord.get(record) || [],
        channelByRecord.get(record),
        DEFAULT_DATES,
      );

      const extra = allocateReportPayments(record, reportByRecord.get(record) || []);
      if (extra.overpaid > 0) overpaidList.push(`${record.className} ${record.name}: +${extra.overpaid}`);
      plan.push(...extra.plan);

      for (const item of plan) {
        if (item.amount <= 0) continue;
        const payment = await Payment.create({
          receiptNumber: `${receiptPrefix}-${item.date.getFullYear()}-${pad(await nextSequence('receipt'), 6)}`,
          student: student._id,
          academicYear: year._id,
          term: 'Term 1',
          feeType: item.feeType,
          amount: item.amount,
          paymentMethod: item.method,
          paymentDate: item.date,
          recordedBy: admin._id,
          status: 'ACTIVE',
          note: item.payer ? `Payer: ${item.payer}` : '',
        });
        if (item.feeType === 'UNIFORM') uniformPayments.push(payment);
        paymentCount++;
      }

      // School feeding payment (MEALS) — tracked separately from fees/materials/uniform.
      const meal = mealByRecord.get(record);
      if (meal && meal.amount > 0) {
        const mealDate = new Date(MEAL_LIST_DATE);
        await Payment.create({
          receiptNumber: `${receiptPrefix}-${mealDate.getFullYear()}-${pad(await nextSequence('receipt'), 6)}`,
          student: student._id,
          academicYear: year._id,
          term: 'Term 1',
          feeType: 'MEALS',
          amount: meal.amount,
          paymentMethod: meal.method,
          paymentDate: mealDate,
          recordedBy: admin._id,
          status: 'ACTIVE',
          note: `School feeding (URUTONDE RW'ABANA BARIRA MU KIGO). ${meal.payer ? `Payer: ${meal.payer}` : ''}`.trim(),
        });
        mealCount++;
        mealTotal += meal.amount;
      }
    }
    console.log(`[seed] Loaded ${rosterIndex.length} students and ${paymentCount} payments`);
    console.log(`[seed] School feeding: ${mealByRecord.size} students eat at school (${mealCount} MEALS payments, ${mealTotal} FRW recorded)`);
    console.log(`[seed] Daily/weekly report payments added on top of class sheets: ${reportTotal} FRW`);
    if (overpaidList.length) {
      console.log('[seed] Paid more than materials + school fees (kept as advance on SCHOOL_FEES):');
      overpaidList.forEach((o) => console.log(`        - ${o}`));
    }
    if (unmatched.length) {
      console.log(`[seed] ${unmatched.length} payment lines could not be tied to a student (kept out of the totals):`);
      unmatched.forEach((u) => console.log(`        - ${u}`));
    }

    // STEP 8: UNIFORM ENTITLEMENTS
    let entitlementCount = 0;
    for (const payment of uniformPayments) {
      const student = await Student.findById(payment.student);
      const created = await refreshUniformEntitlements({
        student,
        academicYear: year._id,
        term: 'Term 1',
        payment,
      });
      entitlementCount += created.length;
    }
    console.log(`[seed] Built ${entitlementCount} uniform entitlements`);

    // STEP 9: UNIFORMS TAKEN BY EACH STUDENT (UKO ABANYESHURI BAFASHE IMYENDA)
    // Every item a child took is written as its own ISSUED movement naming the
    // child. The stock sheet's "sold" figure stays the authority for the totals:
    //  - sold > itemised  -> the difference is one "not itemised" ISSUED line
    //  - itemised > sold  -> a RECEIVED correction (clearly labelled) is added
    // so the final balance of every item equals the report's "in stock" figure.
    const REPORT_DATE_SALES = '2026-10-08';
    const takenEvents = [];
    const takenUnmatched = [];
    const takenNoPayment = new Set();
    for (const row of UNIFORM_TAKEN) {
      const record = findRecord(row.name, '', rosterIndex);
      const student = record ? studentByRecord.get(record) : null;
      if (!record) takenUnmatched.push(`#${row.no} ${row.name} (${row.items})`);
      if (record && !(record.uniformPaid > 0)) takenNoPayment.add(`${record.className} ${record.name}`);
      for (const code of row.items.split(/\s+/).filter(Boolean)) {
        takenEvents.push({
          no: row.no,
          itemName: UNIFORM_CODES[code],
          who: record
            ? `${record.name} (${student.studentId}, ${record.className})`
            : `${row.name} (not found in any class sheet)`,
        });
      }
    }

    let issuedLines = 0;
    console.log('[seed] Uniform sales: stock report vs Word list (per student)');
    for (const [name, st] of stockState) {
      const evs = takenEvents.filter((e) => e.itemName === name);
      const d = evs.length;
      let running = st.running;
      const write = async (type, qty, date, reason) => {
        running += type === 'RECEIVED' ? qty : -qty;
        await UniformStockTransaction.create({
          uniformItem: st.item._id,
          type,
          quantity: qty,
          balanceAfter: running,
          date: new Date(date),
          reason: `Seed: ${reason}`,
          performedBy: admin._id,
        });
        issuedLines++;
      };
      if (st.sold > d) {
        await write('ISSUED', st.sold - d, REPORT_DATE_SALES, 'Sold to students (IMYENDA YAGURISHIJWE), not itemised per student - L.P.A Rulindo stock report');
      }
      if (d > st.sold) {
        await write('RECEIVED', d - st.sold, UNIFORM_TAKEN_DATE, `Stock correction: Word list shows ${d} taken but the stock report says ${st.sold} sold`);
      }
      for (const e of evs) {
        await write('ISSUED', 1, UNIFORM_TAKEN_DATE, `Taken by ${e.who} - UKO ABANYESHURI BAFASHE IMYENDA #${e.no}`);
      }
      if (running !== st.inStock) {
        console.warn(`[seed] WARNING ${name}: ledger ends at ${running}, stock report says ${st.inStock}`);
      }
      console.log(`        ${name.padEnd(18)} report sold ${String(st.sold).padStart(3)} | per student ${String(d).padStart(3)} | not itemised ${String(Math.max(0, st.sold - d)).padStart(3)}${d > st.sold ? ` | correction +${d - st.sold}` : ''}`);
    }
    console.log(`[seed] ${takenEvents.length} uniform items recorded against ${UNIFORM_TAKEN.length} Word-list lines (${issuedLines} ledger lines)`);
    if (takenUnmatched.length) {
      console.log('[seed] Took uniform but not found in any class sheet (still deducted from stock):');
      takenUnmatched.forEach((u) => console.log(`        - ${u}`));
    }
    if (takenNoPayment.size) {
      console.log(`[seed] Took uniform items but have NO uniform payment in the class sheet (${takenNoPayment.size}):`);
      [...takenNoPayment].forEach((u) => console.log(`        - ${u}`));
    }

  }

  const classCounts = await Student.aggregate([
    { $group: { _id: '$class', count: { $sum: 1 } } },
    { $lookup: { from: 'schoolclasses', localField: '_id', foreignField: '_id', as: 'c' } },
    { $project: { name: { $arrayElemAt: ['$c.name', 0] }, count: 1 } },
    { $sort: { name: 1 } },
  ]);
  console.log('[seed] Students per class:', classCounts.map((c) => `${c.name}=${c.count}`).join(', '));

  console.log('[seed] Done -> L.P.A RULINDO data is ready (existing records preserved, nothing deleted)');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[seed] Database seeding failed:', err);
  process.exit(1);
}); 