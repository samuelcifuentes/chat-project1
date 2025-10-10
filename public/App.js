// UI mock con: crear/eliminar chats, grupos con miembros, y bot de "Conversación 1" (sin backend)
const chatList     = document.getElementById('chatList');
const emptyState   = document.getElementById('emptyState');
const searchInput  = document.getElementById('searchInput');

const plusBtn      = document.getElementById('plusBtn');
const plusMenu     = document.getElementById('plusMenu');
const addUserBtn   = document.getElementById('addUserBtn');
const addGroupBtn  = document.getElementById('addGroupBtn');

const ctxMenu      = document.getElementById('ctxMenu');
const ctxAddBtn    = document.getElementById('ctxAddMembers');
const ctxDelBtn    = document.getElementById('ctxDelete');

const backdrop     = document.getElementById('backdrop');
const membersModal = document.getElementById('membersModal');
const groupTitle   = document.getElementById('groupTitle');
const pillbox      = document.getElementById('pillbox');
const memberInput  = document.getElementById('memberInput');
const addMemberBtn = document.getElementById('addMemberBtn');
const closeMembers = document.getElementById('closeMembers');
const saveMembers  = document.getElementById('saveMembers');

const messagesDiv  = document.getElementById('messages');
const msgInput     = document.getElementById('msgInput');
const sendBtn      = document.getElementById('sendBtn');

// ===== Estado =====
let items = [];        // { id, type:'user'|'group', name, members?:string[], msgs?: Msg[] }
let activeId = null;
let ctxTargetId = null;
let stagingMembers = [];

function uid(){ return Math.random().toString(36).slice(2,10); }
function initials(name){
  const p = String(name||'').trim().split(/\s+/);
  return ((p[0]?.[0]||'')+(p[1]?.[0]||'')).toUpperCase() || '??';
}
function nowStr(){
  const d = new Date();
  return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}

/* === miembros como "samuel, sebastian, tú" === */
function formatMembersLine(members){
  const clean = (members||[]).map(s=>String(s||'').trim()).filter(Boolean);
  if (clean.length === 0) return 'tú';
  return `${clean.join(', ')}, tú`;
}

/* ====== Render header & lista ====== */
function setHeader(item){
  const nameEl   = document.querySelector('.ch-name');
  const statusEl = document.querySelector('.ch-status');
  const avEl     = document.querySelector('.avatar.big');
  if (!item){
    nameEl.textContent = 'Selecciona un chat';
    statusEl.textContent = '—';
    avEl.textContent = '?';
    return;
  }
  nameEl.textContent = item.name;
  if (item.type === 'group'){
    statusEl.textContent = formatMembersLine(item.members);
  }else{
    statusEl.textContent = 'En línea';
  }
  avEl.textContent = initials(item.name);
}

function renderList(){
  const q = (searchInput.value||'').trim().toLowerCase();
  const data = items.filter(x=>x.name.toLowerCase().includes(q));

  chatList.innerHTML = '';
  data.forEach(item=>{
    const li = document.createElement('li');
    li.className = 'chat-item' + (item.id===activeId?' active':'');

    const av = document.createElement('div');
    av.className = 'avatar' + (item.type==='user'?' online':'');
    av.textContent = (item.type==='user') ? initials(item.name) : 'GR';

    const main = document.createElement('div'); main.className='ci-main';
    const r1 = document.createElement('div'); r1.className='ci-row';
    const name = document.createElement('div'); name.className='ci-name'; name.textContent=item.name;
    const right = document.createElement('div'); right.className='ci-right';
    const time = document.createElement('span'); time.className='ci-time';
    const last = lastMsg(item);
    time.textContent = last?.time || '';
    right.appendChild(time);
    r1.appendChild(name); r1.appendChild(right);

    const r2 = document.createElement('div'); r2.className='ci-row';
    const preview = document.createElement('div'); preview.className='ci-preview';
    if (item.type==='group'){
      // preview = miembros
      preview.textContent = formatMembersLine(item.members);
    } else {
      // preview = último texto
      preview.textContent = last?.text || '';
    }
    r2.appendChild(preview);

    main.appendChild(r1); main.appendChild(r2);
    li.appendChild(av); li.appendChild(main);

    // seleccionar
    li.onclick = (e)=>{ if (e.button===0){ activeId=item.id; setHeader(item); renderMessages(item); renderList(); } };

    // menú contextual
    li.addEventListener('contextmenu', (e)=>{
      e.preventDefault();
      ctxTargetId = item.id;
      ctxAddBtn.style.display = (item.type==='group') ? 'block' : 'none';
      ctxMenu.style.left = `${e.clientX}px`;
      ctxMenu.style.top  = `${e.clientY}px`;
      ctxMenu.classList.remove('hidden');
    });

    chatList.appendChild(li);
  });

  emptyState.style.display = items.length ? 'none' : 'block';
}

/* ====== Mensajes ====== */
function renderMessages(item){
  messagesDiv.innerHTML = '';
  const msgs = item.msgs || [];
  msgs.forEach(m => {
    const b = document.createElement('div');
    b.className = 'bubble ' + (m.from==='me' ? 'me' : 'other');
    b.textContent = m.text;
    const t = document.createElement('div'); t.className = 'b-time'; t.textContent = m.time;
    b.appendChild(t);
    messagesDiv.appendChild(b);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function lastMsg(item){
  const a = item.msgs || [];
  return a.length ? a[a.length-1] : null;
}

/* ====== BOT — Conversación 1 (solo estas reglas) ====== */

// Normaliza: minúsculas, sin tildes, sin signos
function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¡!¿?.,:;()/\\[\]{}<>"'`~^|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeBotReply(item, userText){
  const raw = String(userText || '');
  const txt = normalizeText(raw);

  // 1) "chao" -> "dale chao"
  if (txt.includes('chao')) {
    return 'dale chao';
  }

  // 2) "como estas" -> "hola, ¿bien y tu?"
  if (txt.includes('como estas')) {
    return 'hola, ¿bien y tu?';
  }

  // 3) "bien, gracias" -> "y que haces?"
  if (txt.includes('bien gracias')) {
    return 'y que haces?';
  }

  // 4) "nada" -> "yo nada ,¿quieres hacer algo?"
  if (txt.includes('nada')) {
    return 'yo nada ,¿quieres hacer algo?';
  }

  // 5) "hagamos algo" -> aleatorio entre 3 opciones
  if (txt.includes('hagamos algo')) {
    const opciones = [
      '¿quieres ir a comer?',
      '¿quieres ir a tomar algo?',
      '¿quieres ir al cine?'
    ];
    return opciones[Math.floor(Math.random() * opciones.length)];
  }

  // 6) "comer" -> "Que vamos a comer o que"
  if (txt.includes('comer')) {
    return 'Que vamos a comer o que';
  }

  // 6 (bis)) "hamburguesa|pizza|salchipapa|perro" -> "de una, entonces ya nos vemos"
  if (['hamburguesa', 'pizza', 'salchipapa', 'perro'].some(k => txt.includes(k))) {
    return 'de una, entonces ya nos vemos';
  }

  // 7) "tomar" -> "Hagale, de una paso por vos ¿Qué nos tomamos o que?"
  if (txt.includes('tomar')) {
    return 'Hagale, de una paso por vos ¿Qué nos tomamos o que?';
  }

  // 8) "cerveza|coctel|guaro" -> "uf si pega, entonces me alisto y te llego o que"
  if (['cerveza', 'coctel', 'guaro'].some(k => txt.includes(k))) {
    return 'uf si pega, entonces me alisto y te llego o que';
  }

  // 9) "hagale" -> "listo, ya te llego"
  if (txt.includes('hagale')) {
    return 'listo, ya te llego';
  }

  // 10) "cine" -> "Nah, que pereza hagamos otra cosa"
  if (txt.includes('cine')) {
    return 'Nah, que pereza hagamos otra cosa';
  }

  // Fallback mínimo (no pediste más respuestas)
  return 'ok';
}

/* ====== Envío + Bot ====== */
function sendMessage(){
  if (!activeId) return;
  const item = items.find(x=>x.id===activeId);
  if (!item) return;
  const text = msgInput.value.replace(/\s+$/,'');
  if (!text) return;

  const m = { from:'me', text, time: nowStr() };
  if (!item.msgs) item.msgs = [];
  item.msgs.push(m);
  msgInput.value = '';
  autoResize(msgInput);

  renderMessages(item);
  renderList();

  // Simular bot-reply con pequeño delay
  setTimeout(()=>{
    const replyText = makeBotReply(item, m.text);
    const r = { from:'bot', text: replyText, time: nowStr() };
    item.msgs.push(r);
    if (item.id === activeId){
      renderMessages(item);
    }
    renderList();
  }, 420 + Math.floor(Math.random()*380));
}

/* ====== Composer UX ====== */
function autoResize(el){
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
msgInput.addEventListener('input', ()=> autoResize(msgInput));
msgInput.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    sendMessage();
  }
});
sendBtn.addEventListener('click', sendMessage);

/* ====== Menús ====== */
function closeMenus(){
  plusMenu.classList.add('hidden');
  ctxMenu.classList.add('hidden');
}
plusBtn.addEventListener('click', ()=> plusMenu.classList.toggle('hidden'));
document.addEventListener('click', (e)=>{
  if (!plusBtn.contains(e.target) && !plusMenu.contains(e.target) && !ctxMenu.contains(e.target)){
    closeMenus();
  }
});

/* ====== Crear chats/grupos ====== */
addUserBtn.addEventListener('click', ()=>{
  const name = prompt('Nombre del nuevo chat (usuario):');
  if (!name) return;
  items.push({ id:uid(), type:'user', name:name.trim(), msgs:[] });
  closeMenus(); renderList();
});

addGroupBtn.addEventListener('click', ()=>{
  const name = prompt('Nombre del nuevo grupo:');
  if (!name) return;
  items.push({ id:uid(), type:'group', name:name.trim(), members:[], msgs:[] });
  closeMenus(); renderList();
});

/* ====== Contextual: eliminar / miembros ====== */
ctxDelBtn.addEventListener('click', ()=>{
  if (!ctxTargetId) return;
  const it = items.find(x=>x.id===ctxTargetId);
  if (!it) return;
  const ok = confirm(`¿Eliminar "${it.name}"?`);
  if (!ok) return;
  items = items.filter(x=>x.id!==ctxTargetId);
  if (activeId===ctxTargetId){ activeId=null; setHeader(null); messagesDiv.innerHTML=''; }
  ctxTargetId=null; closeMenus(); renderList(); emptyState.style.display = items.length ? 'none' : 'block';
});

ctxAddBtn.addEventListener('click', ()=>{
  if (!ctxTargetId) return;
  const it = items.find(x=>x.id===ctxTargetId && x.type==='group');
  if (!it) return;
  openMembersModal(it); closeMenus();
});

/* ====== Modal miembros ====== */
function openMembersModal(groupItem){
  groupTitle.textContent = groupItem.name;
  stagingMembers = Array.isArray(groupItem.members) ? [...groupItem.members] : [];
  drawPills();
  backdrop.classList.remove('hidden');
  membersModal.classList.remove('hidden');
  setTimeout(()=> memberInput.focus(), 20);

  saveMembers.onclick = ()=>{
    groupItem.members = Array.from(new Set(
      (stagingMembers||[]).map(s=>String(s||'').trim()).filter(Boolean)
    ));
    if (activeId === groupItem.id) setHeader(groupItem);
    renderList();
    closeMembersModal();
  };
}
function closeMembersModal(){
  membersModal.classList.add('hidden');
  backdrop.classList.add('hidden');
  memberInput.value=''; stagingMembers = [];
}
closeMembers.addEventListener('click', closeMembersModal);
backdrop.addEventListener('click', closeMembersModal);

addMemberBtn.addEventListener('click', ()=>{
  const n = memberInput.value.trim();
  if (!n) return;
  if (!stagingMembers.includes(n)) stagingMembers.push(n);
  memberInput.value=''; memberInput.focus(); drawPills();
});
memberInput.addEventListener('keydown', (e)=>{
  if (e.key==='Enter'){ e.preventDefault(); addMemberBtn.click(); }
});
function drawPills(){
  pillbox.innerHTML = '';
  if (!stagingMembers.length){
    const hint=document.createElement('div');
    hint.className='modal-subtitle';
    hint.textContent='No hay miembros. Agrega personas con el campo de arriba.';
    pillbox.appendChild(hint); return;
  }
  stagingMembers.forEach((m,i)=>{
    const p = document.createElement('div'); p.className='pill';
    const t = document.createElement('span'); t.textContent=m;
    const x = document.createElement('span'); x.className='x'; x.textContent='✕';
    x.onclick = ()=>{ stagingMembers.splice(i,1); drawPills(); };
    p.appendChild(t); p.appendChild(x);
    pillbox.appendChild(p);
  });
}

/* ====== Boot ====== */
renderList();
setHeader(null);
