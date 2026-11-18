// Sign in, Sign up, Forgot password, Change password and Request access screens
import { sb, h, hi, toast, friendly } from './core.js';
import { logoImg, brandName, brandSub } from './brand.js';

const shell = (root, ...kids) => root.replaceChildren(h('div', { class: 'auth-bg' }, h('i', { class: 'orb o1' }), h('i', { class: 'orb o2' }), h('i', { class: 'orb o3' }),
  h('div', { class: 'auth-wrap' }, h('div', { class: 'auth-hero' }, h('div', { class: 'auth-logo' }, logoImg(92)), h('h1', {}, 'Chhipa One'), h('p', {}, brandName()), brandSub() ? h('small', {}, brandSub().toUpperCase()) : null), ...kids)));
const field = (label, input) => h('div', { class: 'fld' }, h('label', {}, label), input);
const eye = input => h('button', { type: 'button', class: 'eye', title: 'Show / hide', onclick: () => { input.type = input.type === 'password' ? 'text' : 'password'; } }, '👁');
const pwBox = input => h('div', { class: 'pwbox' }, input, eye(input));

export function showLogin(root) {
  const email = h('input', { type: 'email', autocomplete: 'username', placeholder: 'name@example.com' }), pass = h('input', { type: 'password', autocomplete: 'current-password', placeholder: '••••••••' });
  const err = h('div', { class: 'err' }), btn = h('button', { class: 'btn big', type: 'submit' }, 'Sign in · लॉगिन');
  const go = async e => {
    e.preventDefault(); err.textContent = ''; btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value });
    btn.disabled = false;
    if (error) err.textContent = /rate|too many/i.test(error.message) ? 'Too many attempts. Please wait a few minutes.' : 'Email or password is incorrect.';
  };
  shell(root, h('form', { class: 'card auth-card', onsubmit: go }, h('h2', {}, hi('Welcome back', 'वापसी पर स्वागत')), h('p', { class: 'muted' }, 'Sign in to your account'),
    field(hi('Email', 'ईमेल'), email), field(hi('Password', 'पासवर्ड'), pwBox(pass)), err, btn,
    h('div', { class: 'auth-links' }, h('a', { href: '#', onclick: e => { e.preventDefault(); showForgot(root); } }, 'Forgot password?'))),
    h('div', { class: 'auth-alt' }, h('span', {}, 'New here?'), h('button', { class: 'btn alt', type: 'button', onclick: () => showSignup(root) }, 'Sign up · खाता बनाएँ')));
}

export function showSignup(root) {
  const email = h('input', { type: 'email', autocomplete: 'username', placeholder: 'name@example.com' }), pass = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'At least 8 characters' }), pass2 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Type the password again' });
  const err = h('div', { class: 'err' }), btn = h('button', { class: 'btn big', type: 'submit' }, 'Create account');
  const go = async e => {
    e.preventDefault(); err.className = 'err'; err.textContent = '';
    if (!email.value.trim()) return (err.textContent = 'Enter your e-mail.');
    if (pass.value.length < 8) return (err.textContent = 'Password must be at least 8 characters.');
    if (pass.value !== pass2.value) return (err.textContent = 'The two passwords do not match.');
    btn.disabled = true; const { data, error } = await sb.auth.signUp({ email: email.value.trim(), password: pass.value }); btn.disabled = false;
    if (error) err.textContent = /already registered/i.test(error.message) ? 'This e-mail already has a login. Please sign in.' : /signups? not allowed/i.test(error.message) ? 'Sign-ups are switched off. Please ask your admin to create your login.' : error.message;
    else if (!data.session) { err.className = 'ok'; err.textContent = 'Account created. Please confirm the e-mail we sent you, then sign in.'; }
  };
  shell(root, h('form', { class: 'card auth-card', onsubmit: go }, h('h2', {}, hi('Create your account', 'खाता बनाएँ')), h('p', { class: 'muted' }, 'Use the e-mail your admin invited. If you were not invited, you can still sign up and request agent access.'),
    field('Email', email), field('Password', pwBox(pass)), field('Confirm password', pass2), err, btn),
    h('div', { class: 'auth-alt' }, h('span', {}, 'Already have an account?'), h('button', { class: 'btn alt', type: 'button', onclick: () => showLogin(root) }, '← Sign in')));
}

export function showForgot(root) {
  const email = h('input', { type: 'email', placeholder: 'name@example.com' }), msg = h('div', { class: 'err' }), btn = h('button', { class: 'btn big', type: 'submit' }, 'Send request');
  const go = async e => {
    e.preventDefault(); msg.className = 'err'; msg.textContent = ''; if (!email.value.trim()) return (msg.textContent = 'Enter your e-mail.');
    btn.disabled = true; const { error } = await sb.rpc('pwd_request', { p_email: email.value.trim() }); btn.disabled = false;
    if (error) return (msg.textContent = friendly(error));
    msg.className = 'ok'; msg.textContent = 'Request sent. Your admin one level above (or the Super Admin) will approve it and give you a temporary password. Then sign in and set your own.';
  };
  shell(root, h('form', { class: 'card auth-card', onsubmit: go }, h('h2', {}, 'Forgot password?'), h('p', { class: 'muted' }, 'Enter your e-mail. A request goes to the admin one level above you. No e-mail is sent.'), field('Email', email), msg, btn),
    h('div', { class: 'auth-alt' }, h('button', { class: 'btn alt', type: 'button', onclick: () => showLogin(root) }, '← Back to sign in')));
}

// Shown after an admin generated a temporary password: the person must choose their own before continuing
export function showChangePassword(root, done) {
  const p1 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'New password (8+ characters)' }), p2 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Type it again' }), err = h('div', { class: 'err' }), btn = h('button', { class: 'btn big', type: 'submit' }, 'Save new password');
  const go = async e => {
    e.preventDefault(); err.textContent = ''; if (p1.value.length < 8) return (err.textContent = 'At least 8 characters.'); if (p1.value !== p2.value) return (err.textContent = 'The two passwords do not match.');
    btn.disabled = true; const { error } = await sb.auth.updateUser({ password: p1.value }); if (error) { btn.disabled = false; return (err.textContent = friendly(error)); }
    await sb.rpc('password_changed'); toast('Password changed'); done();
  };
  shell(root, h('form', { class: 'card auth-card', onsubmit: go }, h('h2', {}, 'Set your own password'), h('p', { class: 'muted' }, 'You signed in with a temporary password. Please choose a new one to continue.'), field('New password', pwBox(p1)), field('Confirm', p2), err, btn));
}

// Signed in but not yet staff: ask to join as an agent of a location
export async function showAccessRequest(root, session) {
  const st = await sb.rpc('my_access_request'), locs = await sb.rpc('public_locations');
  const out = () => sb.auth.signOut();
  if (st.data === 'pending') return shell(root, h('div', { class: 'card auth-card' }, h('h2', {}, 'Request sent ✓'), h('p', {}, 'Your request to join as an agent is waiting for approval by the admin of your location. Please check again later.'), h('button', { class: 'btn alt', onclick: () => location.reload() }, 'Check again'), ' ', h('button', { class: 'btn alt', onclick: out }, 'Sign out')));
  const name = h('input', { placeholder: 'Your full name' }), phone = h('input', { type: 'tel', inputmode: 'numeric', maxlength: 10, placeholder: '10-digit mobile' }), note = h('input', { placeholder: 'Anything the admin should know (optional)' }), err = h('div', { class: 'err' });
  const loc = h('select', {}, h('option', { value: '' }, 'Choose your location'), (locs.data || []).map(l => h('option', { value: l.id }, l.city + ' · ' + l.state)));
  const btn = h('button', { class: 'btn big', type: 'submit' }, 'Request agent access');
  const go = async e => { e.preventDefault(); err.textContent = ''; btn.disabled = true; const { error } = await sb.rpc('access_request_submit', { p_name: name.value, p_phone: phone.value, p_location: loc.value || null, p_note: note.value }); btn.disabled = false; if (error) return (err.textContent = friendly(error)); showAccessRequest(root, session); };
  shell(root, h('form', { class: 'card auth-card', onsubmit: go }, h('h2', {}, 'Request access'), h('p', { class: 'muted' }, 'Your login (' + session.user.email + ') is not linked to any role yet. Ask to join as an agent; the admin of your location will approve it.'),
    field('Full name', name), field('Mobile', phone), field('Location', loc), field('Note', note), err, btn),
    h('div', { class: 'auth-alt' }, h('button', { class: 'btn alt', type: 'button', onclick: out }, 'Sign out')));
}
