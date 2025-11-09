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
const micBtn       = document.getElementById('micBtn');

const API_BASE = window.location.origin;
let sessionId = null;
let clientId = null;
let clientName = null;

let items = []; 
let activeId = null;
let ctxTargetId = null;
let stagingMembers = [];

async function initSession() {
  try {
    sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', sessionId);
    }

    const response = await fetch(`${API_BASE}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    const data = await response.json();
    if (data.ok) {
      clientId = data.clientId;
      clientName = data.clientName;
      console.log('[CLIENT] Session initialized:', clientId);
    } else {
      console.error('[CLIENT] Failed to initialize session:', data.error);
      alert('Failed to initialize session: ' + data.error);
    }
  } catch (error) {
    console.error('[CLIENT] Error initializing session:', error);
    alert('Error connecting to server: ' + error.message);
  }
}

async function createGroup(name, members = []) {
  try {
    const response = await fetch(`${API_BASE}/api/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, name, members })
    });
    const data = await response.json();
    if (data.ok) {
      return data.group;
    } else {
      throw new Error(data.error || 'Failed to create group');
    }
  } catch (error) {
    console.error('[CLIENT] Error creating group:', error);
    throw error;
  }
}

async function sendMessage(to, toType, text) {
  try {
    const response = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, to, toType, text })
    });
    const data = await response.json();
    if (data.ok) {
      return data.message;
    } else {
      throw new Error(data.error || 'Failed to send message');
    }
  } catch (error) {
    console.error('[CLIENT] Error sending message:', error);
    throw error;
  }
}

async function getHistory(targetId, targetType) {
  try {
    const response = await fetch(`${API_BASE}/api/history?sessionId=${sessionId}&targetId=${targetId}&targetType=${targetType}`);
    const data = await response.json();
    if (data.ok) {
      return data.messages || [];
    } else {
      throw new Error(data.error || 'Failed to get history');
    }
  } catch (error) {
    console.error('[CLIENT] Error getting history:', error);
    return [];
  }
}

function uid(){ return Math.random().toString(36).slice(2,10); }
function initials(name){
  const p = String(name||'').trim().split(/\s+/);
  return ((p[0]?.[0]||'')+(p[1]?.[0]||'')).toUpperCase() || '??';
}
function formatDate(ts){
  const d = new Date(ts);
  return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
function formatMembersLine(members){
  const clean = (members||[]).map(s=>String(s||'').trim()).filter(Boolean);
  return clean.length === 0 ? 'tú' : `${clean.join(', ')}, tú`;
}

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
    statusEl.textContent = formatMembersLine(item.members || []);
  } else {
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
    time.textContent = last ? formatDate(last.ts) : '';
    right.appendChild(time);
    r1.appendChild(name); r1.appendChild(right);
    const r2 = document.createElement('div'); r2.className='ci-row';
    const preview = document.createElement('div'); preview.className='ci-preview';
    if (last?.kind === 'audio') {
      preview.textContent = '🎤 Nota de voz';
    } else {
      preview.textContent = last?.text || (item.type==='group' ? formatMembersLine(item.members || []) : '');
    }
    r2.appendChild(preview);
    main.appendChild(r1); main.appendChild(r2);
    li.appendChild(av); li.appendChild(main);
    li.onclick = async ()=>{ 
      activeId=item.id; 
      setHeader(item); 
      await loadAndRenderMessages(item); 
      renderList(); 
    };
    li.addEventListener('contextmenu',(e)=>{
      e.preventDefault();
      ctxTargetId=item.id;
      ctxAddBtn.style.display=(item.type==='group')?'block':'none';
      ctxMenu.style.left=`${e.clientX}px`;
      ctxMenu.style.top =`${e.clientY}px`;
      ctxMenu.classList.remove('hidden');
    });
    chatList.appendChild(li);
  });
  emptyState.style.display = items.length ? 'none' : 'block';
}

function lastMsg(item){
  const a=item.msgs||[];
  return a.length ? a[a.length-1] : null;
}

async function loadAndRenderMessages(item){
  if (!item) return;
  
  // Load history from backend
  try {
    const messages = await getHistory(item.id, item.type);
    // Convert backend messages to local format
    item.msgs = messages.map(msg => ({
      id: msg.id,
      from: msg.from === clientId ? 'me' : (msg.fromName || 'other'),
      text: msg.text || '',
      audioFile: msg.audioFile,
      time: formatDate(msg.ts),
      ts: msg.ts,
      kind: msg.kind || 'text',
      type: msg.kind === 'audio' ? 'voice' : 'text'
    }));
  } catch (error) {
    console.error('[CLIENT] Error loading messages:', error);
    item.msgs = item.msgs || [];
  }
  
  renderMessages(item);
}

function renderMessages(item){
  messagesDiv.innerHTML='';
  (item.msgs||[]).forEach(m=>{
    const b=document.createElement('div');
    b.className='bubble '+(m.from==='me'?'me':'other');
    if(m.kind==='audio' || m.type==='voice'){
      const a=document.createElement('audio');
      a.controls=true;
      if (m.audioFile) {
        a.src = m.audioFile.startsWith('http') ? m.audioFile : `${API_BASE}${m.audioFile}`;
      }
      a.style.maxWidth='320px';
      b.appendChild(a);
    }else{
      const t=document.createElement('div');
      t.textContent=m.text;
      b.appendChild(t);
    }
    const t=document.createElement('div');
    t.className='b-time';
    t.textContent=m.time || formatDate(m.ts);
    b.appendChild(t);
    messagesDiv.appendChild(b);
  });
  messagesDiv.scrollTop=messagesDiv.scrollHeight;
}

async function sendMessageHandler(){
  if (!activeId) return;
  const item = items.find(x=>x.id===activeId);
  if (!item) return;
  const text = msgInput.value.trim();
  if (!text) return;

  try {
    // Send message via API
    const message = await sendMessage(item.id, item.type, text);
    
    // Add to local state
    if(!item.msgs) item.msgs=[];
    item.msgs.push({
      id: message.id,
      from: 'me',
      text: message.text,
      time: formatDate(message.ts),
      ts: message.ts,
      kind: 'text',
      type: 'text'
    });
    
    msgInput.value='';
    renderMessages(item); 
    renderList();
  } catch (error) {
    console.error('[CLIENT] Error sending message:', error);
    alert('Error sending message: ' + error.message);
  }
}

// Voice recorder (disabled for now - will be implemented with WebSockets later)
function VoiceRecorder(onStopCallback){
  this.mediaRecorder=null;
  this.chunks=[];
  this.onStopCallback=onStopCallback;
}
VoiceRecorder.prototype.start=async function(){
  alert('Voice notes will be implemented with WebSockets in a future version');
};
VoiceRecorder.prototype.stop=function(){};

const voiceRecorder=new VoiceRecorder(function(blob){
});

let isRecording=false;
micBtn.addEventListener('click',async()=>{
  alert('Voice notes will be implemented with WebSockets in a future version');
});

function autoResize(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,120)+'px';
}
msgInput.addEventListener('input',()=>autoResize(msgInput));
msgInput.addEventListener('keydown',(e)=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessageHandler();}
});
sendBtn.addEventListener('click',sendMessageHandler);

plusBtn.addEventListener('click',()=>plusMenu.classList.toggle('hidden'));
document.addEventListener('click',(e)=>{
  if(!plusBtn.contains(e.target)&&!plusMenu.contains(e.target)&&!ctxMenu.contains(e.target)){
    plusMenu.classList.add('hidden'); ctxMenu.classList.add('hidden');
  }
});

addUserBtn.addEventListener('click',()=>{
  alert('Direct user chats are not implemented in this version. Please create a group instead.');
});

addGroupBtn.addEventListener('click',async()=>{
  const name=prompt('Nombre del nuevo grupo:');
  if(!name) return;
  
  try {
    const group = await createGroup(name.trim());
    // Add to local state
    items.push({
      id: group.id,
      type: 'group',
      name: group.name,
      members: group.members || [],
      msgs: []
    });
    plusMenu.classList.add('hidden');
    renderList();
  } catch (error) {
    alert('Error creating group: ' + error.message);
  }
});

ctxDelBtn.addEventListener('click',()=>{
  if(!ctxTargetId)return;
  const it=items.find(x=>x.id===ctxTargetId);
  if(!it)return;
  const ok=confirm(`¿Eliminar "${it.name}"?`);
  if(!ok)return;
  items=items.filter(x=>x.id!==ctxTargetId);
  if(activeId===ctxTargetId){activeId=null;setHeader(null);messagesDiv.innerHTML='';}
  ctxTargetId=null; ctxMenu.classList.add('hidden'); renderList();
});

ctxAddBtn.addEventListener('click',()=>{
  if(!ctxTargetId)return;
  const it=items.find(x=>x.id===ctxTargetId&&x.type==='group');
  if(!it)return;
  openMembersModal(it); ctxMenu.classList.add('hidden');
});

function openMembersModal(groupItem){
  groupTitle.textContent=groupItem.name;
  stagingMembers=[...(groupItem.members||[]).filter(m => m !== clientId)]; // Don't show clientId
  drawPills();
  backdrop.classList.remove('hidden');
  membersModal.classList.remove('hidden');
  setTimeout(()=>memberInput.focus(),20);
  saveMembers.onclick=()=>{
   
    groupItem.members=[clientId, ...new Set(stagingMembers.map(s=>s.trim()).filter(Boolean))];
    if(activeId===groupItem.id)setHeader(groupItem);
    renderList(); closeMembersModal();
  };
}
function closeMembersModal(){
  membersModal.classList.add('hidden');
  backdrop.classList.add('hidden');
  memberInput.value=''; stagingMembers=[];
}
closeMembers.addEventListener('click',closeMembersModal);
backdrop.addEventListener('click',closeMembersModal);
addMemberBtn.addEventListener('click',()=>{
  const n=memberInput.value.trim();
  if(!n)return;
  if(!stagingMembers.includes(n))stagingMembers.push(n);
  memberInput.value=''; memberInput.focus(); drawPills();
});
memberInput.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();addMemberBtn.click();}});
function drawPills(){
  pillbox.innerHTML='';
  if(!stagingMembers.length){
    const hint=document.createElement('div');
    hint.className='modal-subtitle';
    hint.textContent='No hay miembros. Agrega personas con el campo de arriba.';
    pillbox.appendChild(hint);
    return;
  }
  stagingMembers.forEach((m,i)=>{
    const p=document.createElement('div'); p.className='pill';
    const t=document.createElement('span'); t.textContent=m;
    const x=document.createElement('span'); x.className='x'; x.textContent='✕';
    x.onclick=()=>{stagingMembers.splice(i,1);drawPills();};
    p.appendChild(t); p.appendChild(x);
    pillbox.appendChild(p);
  });
}

// Initialize on page load
initSession().then(() => {
  renderList();
  setHeader(null);
});
