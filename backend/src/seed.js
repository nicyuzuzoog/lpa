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

const CLASS_FEES = {
  N1: { school: 71000, materials: 30000, uniform: 32000 },
  N2: { school: 71000, materials: 30000, uniform: 32000 },
  N3: { school: 71000, materials: 30000, uniform: 32000 },
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

const UNIFORMS = [
  { name: 'School Shirt', gender: 'UNISEX', price: 8000 },
  { name: 'School Shorts - Boys', gender: 'BOYS', price: 8000 },
  { name: 'School Skirt - Girls', gender: 'GIRLS', price: 8000 },
  { name: 'Sports Shorts', gender: 'UNISEX', price: 5000 },
  { name: 'School Sweater', gender: 'UNISEX', price: 7000 },
  { name: 'Socks', gender: 'UNISEX', price: 4000 },
];

// MoMo Payment Records
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

// Equity Bank Payment Records
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

// Complete Roster extracted from Class Sheets (P1 to P5, N2, N3)
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
  { className: 'N2', name: 'NTABWOBA SEZERANO KEILLA', fatherPhone: '0783407117', motherPhone: '0783320216', materialsPaid: 0, feesPaid: 71000, balance: 17000, uniformPaid: 17000, totalPaid: 71000 },
  { className: 'N2', name: 'RUBERANGEYO IHIRWE GAELLA', fatherPhone: '0788453034', motherPhone: '0783031666', materialsPaid: 0, feesPaid: 45000, balance: 33000, uniformPaid: 10000, totalPaid: 45000 },
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
];

const FEMALE_TOKENS = [
  'MARIE', 'CLAUDETTE', 'CHANCELINE', 'PRECIAS', 'BRITINNY', 'GAELLE', 'GAELL',
  'ESTHER', 'ESTER', 'OLGA', 'JOICE', 'DAELLA', 'DAELA', 'SANDRA', 'BLENDA',
  'KESSIA', 'ORNELLA', 'ORNELL', 'NEILLA', 'JESSCA', 'JESSY', 'SABINE', 'NOELLA',
  'QUEEN', 'CHANELA', 'AVILLA', 'LUNA', 'NICOLE', 'DANIELLA', 'CLOADIA', 'KEILLA',
  'GAELLA', 'LAVINIA', 'BRIELLA', 'JESCA', 'GIA', 'HOPE', 'BRIANA', 'ISABELLE',
  'EMMANUELLA', 'KEZA', 'ADELINE', 'VICKY', 'ANGEL', 'RUTH', 'IRIS', 'MIA',
  'GLORIA', 'JOVIA', 'MEGHAN', 'INEZA', 'SHALLOM', 'LELOU',
];

function nameParts(full) {
  const parts = String(full || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || firstName;
  return { firstName, lastName };
}

function inferGender(name) {
  const upper = String(name || '').toUpperCase();
  for (const token of FEMALE_TOKENS) {
    if (upper.includes(token)) return 'FEMALE';
  }
  return 'MALE';
}

function normalizeKey(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function run() {
  if (!config.mongoUri) {
    console.error('MONGODB_URI is required to seed the database');
    process.exit(1);
  }
  await mongoose.connect(config.mongoUri);
  console.log('[seed] Connected to MongoDB');

  // --------------------------------------------------------------------------
  // STEP 1: DELETE EXISTING COLLECTIONS (fresh seed each run)
  // --------------------------------------------------------------------------
  console.log('[seed] Clearing existing collections...');
  await mongoose.connection.dropDatabase();
  console.log('[seed] Database cleared.');

  // --------------------------------------------------------------------------
  // STEP 2: SEED SYSTEM USERS
  // --------------------------------------------------------------------------
  const admin = await User.create({
    fullName: 'System Administrator',
    username: 'admin',
    password: 'admin12345',
    role: 'SUPER_ADMIN',
    email: 'admin@school.local',
  });
  console.log('[seed] Created super admin -> admin / admin12345');

  await User.create({
    fullName: 'School Accountant',
    username: 'accountant',
    password: 'account12345',
    role: 'ACCOUNTANT',
  });
  console.log('[seed] Created accountant -> accountant / account12345');

  await User.create({
    fullName: 'Big Boss',
    username: 'boss',
    password: 'boss123456',
    role: 'BIG_BOSS',
  });
  console.log('[seed] Created big boss -> boss / boss123456');

  // --------------------------------------------------------------------------
  // STEP 3: SEED CLASSES & ACADEMIC YEAR
  // --------------------------------------------------------------------------
  const classIds = {};
  let order = 1;
  for (const [name, fees] of Object.entries(CLASS_FEES)) {
    const cls = await SchoolClass.create({
      name,
      level: name.startsWith('N') ? 'NURSERY' : 'PRIMARY',
      order: order++,
    });
    classIds[name] = cls._id;
  }
  console.log('[seed] School classes initialized');

  const year = await AcademicYear.create({
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
  console.log('[seed] Academic year 2026-2027 initialized');

  // --------------------------------------------------------------------------
  // STEP 4: SEED FEE STRUCTURES & ITEMS
  // --------------------------------------------------------------------------
  const terms = ['Term 1', 'Term 2', 'Term 3'];
  for (const term of terms) {
    for (const [name, fees] of Object.entries(CLASS_FEES)) {
      const entries = [
        ['SCHOOL_FEES', fees.school],
        ['MATERIALS', fees.materials],
        ['UNIFORM', fees.uniform],
      ];
      for (const [feeType, amount] of entries) {
        await FeeStructure.create({
          academicYear: year._id,
          term,
          class: classIds[name],
          feeType,
          requiredAmount: amount,
        });
      }
    }
  }
  console.log('[seed] Fee structures configured');

  for (const m of MATERIALS) {
    await FeeItem.create({ category: 'MATERIAL', name: m.name, price: m.price, order: 1 });
  }
  for (const m of MATERIALS_P45) {
    await FeeItem.create({
      category: 'MATERIAL',
      name: `${m.name} (P4/P5)`,
      price: m.price,
      classes: [classIds.P4, classIds.P5],
      order: 1,
    });
  }
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
  for (const [i, u] of UNIFORM_FEE_ITEMS.entries()) {
    await FeeItem.create({ category: 'UNIFORM', name: u.name, price: u.price, order: i + 1 });
  }
  console.log('[seed] Fee items ready');

  // --------------------------------------------------------------------------
  // STEP 5: SEED UNIFORM INVENTORY (UPDATED FROM REPORT)
  // --------------------------------------------------------------------------
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

  for (const s of UNIFORM_STOCK) {
    const quantityIssued = s.sold + s.returned;
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
    await UniformStockTransaction.create({
      uniformItem: item._id,
      type: 'RECEIVED',
      quantity: s.received,
      balanceAfter: s.received - quantityIssued,
      date: new Date('2026-09-01'),
      reason: 'Seed: opening stock per L.P.A Rulindo ledger',
      performedBy: admin._id,
    });
  }
  console.log('[seed] Uniform stock ledger loaded');

  // --------------------------------------------------------------------------
  // STEP 6: SEED OTHER INVENTORY & SETTINGS
  // --------------------------------------------------------------------------
  await InventoryItem.create([
    { name: 'Kawunga', category: 'FOOD', unit: 'Bags', openingStock: 10, currentStock: 10, minimumStockLevel: 5, unitCost: 12000 },
    { name: 'Exercise Books', category: 'SCHOOL_BOOKS', unit: 'Pieces', openingStock: 500, currentStock: 500, minimumStockLevel: 100, unitCost: 300 },
    { name: 'Pens', category: 'STATIONERY', unit: 'Pieces', openingStock: 1000, currentStock: 1000, minimumStockLevel: 200, unitCost: 100 },
    { name: 'Chalk', category: 'OTHER', unit: 'Boxes', openingStock: 40, currentStock: 40, minimumStockLevel: 10, unitCost: 2500 },
  ]);

  const defaults = {
    school_name: 'L.P.A RULINDO',
    school_address: 'Rulindo, Northern Province, Rwanda',
    school_phone: '+250 788 000 000',
    school_email: 'info@lparulindo.ac.rw',
    currency: 'RWF',
    receipt_prefix: 'RCT',
    school_logo: '',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await Setting.set(key, value);
  }
  console.log('[seed] System settings loaded');

  // --------------------------------------------------------------------------
  // STEP 7: SEED STUDENTS (CLASS ROSTERS) AND PER-STUDENT FEE PAYMENTS
  // --------------------------------------------------------------------------
  const DEFAULT_DATES = {
    MATERIALS: new Date('2026-09-03'),
    SCHOOL_FEES: new Date('2026-09-07'),
    UNIFORM: new Date('2026-09-30'),
  };

  const momoIndex = new Map();
  for (const p of MOMO_PAYMENTS) {
    const k = normalizeKey(p.studentName);
    if (k && !momoIndex.has(k)) momoIndex.set(k, { method: 'MOBILE_MONEY', date: new Date(p.date), payer: p.payerName });
  }
  const equityIndex = new Map();
  for (const p of EQUITY_PAYMENTS) {
    const k = normalizeKey(p.studentName);
    if (k && !equityIndex.has(k)) equityIndex.set(k, { method: 'BANK', date: new Date(p.date), payer: '' });
  }

  const uniformPayments = [];
  let paymentCount = 0;
  for (const record of CLASS_ROSTERS) {
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
    });

    const key = normalizeKey(record.name);
    const entries = [
      ['MATERIALS', record.materialsPaid],
      ['SCHOOL_FEES', record.feesPaid],
      ['UNIFORM', record.uniformPaid],
    ];
    for (const [feeType, amount] of entries) {
      if (!amount || amount <= 0) continue;
      const source = momoIndex.get(key) || equityIndex.get(key) || { method: 'CASH', date: DEFAULT_DATES[feeType], payer: '' };
      const payment = await Payment.create({
        receiptNumber: `${await Setting.get('receipt_prefix', 'RCT')}-${source.date.getFullYear()}-${pad(await nextSequence('receipt'), 6)}`,
        student: student._id,
        academicYear: year._id,
        term: 'Term 1',
        feeType,
        amount,
        paymentMethod: source.method,
        paymentDate: source.date,
        recordedBy: admin._id,
        status: 'ACTIVE',
        note: source.payer ? `Payer: ${source.payer.split('(')[0].trim()}` : '',
      });
      if (feeType === 'UNIFORM') uniformPayments.push(payment);
      paymentCount++;
    }
  }
  console.log(`[seed] Loaded ${CLASS_ROSTERS.length} students and ${paymentCount} payments`);

  // --------------------------------------------------------------------------
  // STEP 8: SYNC UNIFORM ENTITLEMENTS FROM UNIFORM PAYMENTS
  // --------------------------------------------------------------------------
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

  const classCounts = await Student.aggregate([
    { $group: { _id: '$class', count: { $sum: 1 } } },
    { $lookup: { from: 'schoolclasses', localField: '_id', foreignField: '_id', as: 'c' } },
    { $project: { name: { $arrayElemAt: ['$c.name', 0] }, count: 1 } },
    { $sort: { name: 1 } },
  ]);
  console.log('[seed] Students per class:', classCounts.map((c) => `${c.name}=${c.count}`).join(', '));

  console.log('[seed] Done -> L.P.A RULINDO seeded with real data');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[seed] Database seeding failed:', err);
  process.exit(1);
});