// Makes every button bilingual: English | हिन्दी (both bold), centred. Runs on the page as it changes.
const HI = {
  'save': 'सहेजें', 'cancel': 'रद्द करें', 'print': 'प्रिंट', 'save pdf': 'पीडीएफ़ सहेजें', 'approve': 'स्वीकृत करें', 'reject': 'अस्वीकार', 'dismiss': 'हटाएँ', 'remove': 'हटाएँ', 'delete': 'मिटाएँ',
  'suspend': 'निलंबित', 'activate': 'सक्रिय करें', 'role': 'भूमिका', 'reset password': 'पासवर्ड रीसेट', 'id card': 'आईडी कार्ड', 'add member': 'सदस्य जोड़ें', 'print all staff cards': 'सभी स्टाफ कार्ड', 'promote': 'पदोन्नति', 'demote': 'पदावनति',
  'confirm': 'पुष्टि करें', 'photo': 'फ़ोटो', 'send invite': 'निमंत्रण भेजें', 'cancel invite': 'निमंत्रण रद्द', 'whatsapp': 'व्हाट्सऐप', 'email': 'ईमेल', 'copy': 'कॉपी', 'edit': 'संपादित', 'add': 'जोड़ें', 'close': 'बंद करें',
  'download': 'डाउनलोड', 'upload': 'अपलोड', 'show': 'दिखाएँ', 'submit': 'जमा करें', 'next': 'आगे', 'back': 'पीछे', 'search': 'खोजें', 'send request': 'अनुरोध भेजें', 'create account': 'खाता बनाएँ', 'sign in': 'लॉगिन', 'sign up': 'साइन अप',
  'save new password': 'नया पासवर्ड सहेजें', 'change password': 'पासवर्ड बदलें', 'save phone': 'फ़ोन सहेजें', 'change photo': 'फ़ोटो बदलें', 'add photo': 'फ़ोटो जोड़ें', 'check again': 'फिर जाँचें', 'sign out': 'साइन आउट',
  'request agent access': 'एजेंट अनुरोध', 'approve & generate': 'स्वीकृत + पासवर्ड', 'add community': 'समुदाय जोड़ें', 'deactivate community': 'समुदाय निष्क्रिय', 'locations': 'स्थान', 'team': 'टीम', 'families': 'परिवार', 'logo & label': 'लोगो व लेबल',
  'my id card': 'मेरा आईडी कार्ड', 'refresh': 'ताज़ा करें', 'apply': 'लागू करें', 'reset': 'रीसेट', 'yes': 'हाँ', 'no': 'नहीं', 'use': 'उपयोग', 'view': 'देखें', 'open': 'खोलें', 'new family': 'नया परिवार', 'import': 'आयात', 'export': 'निर्यात',
  'take backup now': 'अभी बैकअप लें', 'approve all': 'सभी स्वीकृत', 'mark all read': 'सब पढ़ा हुआ', 'full page': 'पूरा पेज', 'add location': 'स्थान जोड़ें', 'add family': 'परिवार जोड़ें', 'add person': 'व्यक्ति जोड़ें',
};
const DEV = /[ऀ-ॿ]/;
function decorate(el) {
  if (el.dataset.bi || el.querySelector('.hi,.bi')) return;
  let raw = el.textContent.replace(/\s+/g, ' ').trim(); if (!raw) return;
  let en, hi, pre = '', post = '';
  const m = /^([^A-Za-zऀ-ॿ]*)(.*?)$/.exec(raw); pre = m[1].trim(); let lab = m[2];
  const tail = /\s*(\(\d+\))$/.exec(lab); if (tail) { post = tail[1]; lab = lab.slice(0, tail.index); }
  if (lab.includes(' · ') && DEV.test(lab.split(' · ')[1] || '')) { [en, hi] = lab.split(' · '); }
  else if (DEV.test(lab)) return;
  else { hi = HI[lab.toLowerCase()]; en = lab; }
  if (!hi) { el.dataset.bi = '1'; return; }
  el.dataset.bi = '1'; el.classList.add('bi');
  const nodes = []; if (pre) nodes.push(Object.assign(document.createElement('span'), { className: 'ic', textContent: pre }));
  nodes.push(Object.assign(document.createElement('b'), { className: 'ben', textContent: en }), Object.assign(document.createElement('i'), { className: 'sep', textContent: '|' }), Object.assign(document.createElement('b'), { className: 'bhi', textContent: hi }));
  if (post) nodes.push(Object.assign(document.createElement('span'), { className: 'cnt', textContent: post }));
  el.replaceChildren(...nodes);
}
let busy = false;
function scan(root) { if (busy) return; busy = true; try { (root.querySelectorAll ? root : document).querySelectorAll('button.btn,a.btn').forEach(decorate); } finally { busy = false; } }
export function startDecorate() {
  scan(document);
  new MutationObserver(ms => { if (busy) return; for (const m of ms) { const t = m.target; const b = t.nodeType === 1 ? t.closest && t.closest('button.btn,a.btn') : t.parentElement && t.parentElement.closest('button.btn,a.btn'); if (b && b.dataset.bi && !b.querySelector('.ben') && m.type !== 'attributes') { delete b.dataset.bi; b.classList.remove('bi'); } } scan(document); }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
