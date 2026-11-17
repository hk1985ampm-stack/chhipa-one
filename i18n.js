// Language modes: both (English + small Hindi, default) · en · hi · ur (Urdu, right-to-left)
export const LANGS = [['both', 'EN/हि'], ['en', 'English'], ['hi', 'हिन्दी'], ['ur', 'اردو']];
export const lang = { v: 'both' };
try { lang.v = localStorage.getItem('chhipa_lang') || 'both'; } catch {}
export function applyLang() {
  const d = document.documentElement; d.lang = lang.v === 'ur' ? 'ur' : lang.v === 'hi' ? 'hi' : 'en'; d.dir = lang.v === 'ur' ? 'rtl' : 'ltr';
  document.body.className = document.body.className.replace(/\blang-\w+\b/g, '').trim() + ' lang-' + lang.v;
}
export function setLang(v) { lang.v = v; try { localStorage.setItem('chhipa_lang', v); } catch {} applyLang(); }
export const nextLang = () => LANGS[(LANGS.findIndex(l => l[0] === lang.v) + 1) % LANGS.length][0];
// Urdu for the labels that appear on screen (key = the English text). Missing keys fall back to Hindi.
export const UR = {
  'Home': 'ہوم', 'Families': 'خاندان', 'Add': 'شامل کریں', 'Alerts': 'اطلاعات', 'Family Registry': 'خاندانی رجسٹر', 'Add Family': 'خاندان شامل کریں', 'Change Requests': 'تبدیلی کی درخواستیں',
  'Life Events': 'زندگی کے واقعات', 'Notifications': 'اطلاعات', 'Reports': 'رپورٹس', 'Data Quality': 'ڈیٹا کی جانچ', 'Removed Entries': 'ہٹائے گئے اندراجات', 'Pending Approvals': 'زیر التواء منظوری',
  'Communities': 'برادریاں', 'Staff & Agents': 'اسٹاف / ایجنٹ', 'Agent Activity': 'ایجنٹ کی سرگرمی', 'Scan QR': 'کیو آر اسکین', 'Birthdays & WhatsApp': 'سالگرہ اور واٹس ایپ', 'Print Center': 'پرنٹ سینٹر',
  'Excel Import / Export': 'ایکسل امپورٹ / ایکسپورٹ', 'Duplicates & Bulk Edit': 'ڈپلیکیٹ / بلک ایڈیٹ', 'Dropdown Lists': 'ڈراپ ڈاؤن فہرست', 'Backup': 'بیک اپ', 'Audit Log': 'آڈٹ لاگ',
  'Annual Donation': 'سالانہ چندہ', 'Zakat Calculator': 'زکوٰۃ کیلکولیٹر', 'Meetings': 'اجلاس', 'Sevaks': 'خدمت گار', 'Announcements': 'اعلانات', 'Events': 'تقریبات',
  'Email': 'ای میل', 'Password': 'پاس ورڈ', 'Sign out': 'سائن آؤٹ', 'Language': 'زبان', 'Save': 'محفوظ کریں', 'Search': 'تلاش', 'Welcome': 'خوش آمدید'
};
