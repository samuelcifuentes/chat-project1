
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

let items = [];
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
    statusEl.textContent = formatMembersLine(item.members);
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
    time.textContent = last?.time || '';
    right.appendChild(time);
    r1.appendChild(name); r1.appendChild(right);
    const r2 = document.createElement('div'); r2.className='ci-row';
    const preview = document.createElement('div'); preview.className='ci-preview';
    if (last?.type === 'voice') {
      preview.textContent = '🎤 Nota de voz';
    } else {
      preview.textContent = last?.text || (item.type==='group' ? formatMembersLine(item.members) : '');
    }
    r2.appendChild(preview);
    main.appendChild(r1); main.appendChild(r2);
    li.appendChild(av); li.appendChild(main);
    li.onclick = ()=>{ activeId=item.id; setHeader(item); renderMessages(item); renderList(); };
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

function renderMessages(item){
  messagesDiv.innerHTML='';
  (item.msgs||[]).forEach(m=>{
    const b=document.createElement('div');
    b.className='bubble '+(m.from==='me'?'me':'other');
    if(m.type==='voice'){
      const a=document.createElement('audio');
      a.controls=true;
      a.src=m.audioURL;
      a.style.maxWidth='320px';
      b.appendChild(a);
    }else{
      const t=document.createElement('div');
      t.textContent=m.text;
      b.appendChild(t);
    }
    const t=document.createElement('div');
    t.className='b-time';
    t.textContent=m.time;
    b.appendChild(t);
    messagesDiv.appendChild(b);
  });
  messagesDiv.scrollTop=messagesDiv.scrollHeight;
}

function normalizeText(s){
  return String(s||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[¡!¿?.,:;()/\\[\]{}<>"'`~^|]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function makeBotReply(item, userText){
  const txt = normalizeText(userText);

  if (txt.includes('chao')) return 'dale chao';
  if (txt.includes('como estas')) return 'hola, ¿bien y tú?';
  if (txt.includes('bien gracias')) return 'y qué haces?';
  if (txt.includes('nada')) return 'yo nada, ¿quieres hacer algo?';
  if (txt.includes('hagamos algo')) return ['¿quieres ir a comer?','¿quieres ir al cine?','¿quieres ir al parque?'][Math.floor(Math.random()*3)];
  if (txt.includes('comer')) return 'Qué vamos a comer o qué';
  if (['hamburguesa','pizza','salchipapa','perro'].some(k=>txt.includes(k))) return 'de una, entonces ya nos vemos';
  if (txt.includes('tomar')) return 'Hágale, ¿qué nos tomamos o qué?';
  if (['cerveza','coctel','guaro'].some(k=>txt.includes(k))) return 'uf si pega, me alisto y te llego o qué';
  if (txt.includes('cine')) return 'Nah, que pereza, hagamos otra cosa';
  if (txt.includes('hagale')) return 'listo, ya te llego';

  if (txt.includes('que haces')) {
    const opciones = [
      'Nada, aquí chill. ¿Y tú qué haces?',
      'Estoy viendo algo en Netflix 😴',
      'Escuchando música, relax 😌',
      'Nada interesante, solo descansando',
      'Tratando de no pensar en el trabajo 😂'
    ];
    return opciones[Math.floor(Math.random()*opciones.length)];
  }

  if (txt.includes('quieres hacer algo') || txt.includes('hacemos algo hoy') || txt.includes('salir')) {
    const opciones = [
      'De una, ¿qué tienes en mente?',
      'Claro, hace rato no salimos 😄',
      'Sí, invítame algo 😏',
      'Mmm podríamos ir al parque o comer algo',
      'Sí, me parece buena idea 👌'
    ];
    return opciones[Math.floor(Math.random()*opciones.length)];
  }

  if (txt.includes('te gusta')) {
    const opciones = [
      'Depende de qué me hables 😅',
      'Puede ser... cuéntame más 👀',
      'Sí, bastante 😄',
      'Mmm no mucho la verdad 🤔'
    ];
    return opciones[Math.floor(Math.random()*opciones.length)];
  }

  if (txt.includes('gracias')) {
    return ['De nada 😄','Con gusto ✨','Para eso estamos 🙌'][Math.floor(Math.random()*3)];
  }

  if (txt.includes('hola')) {
    return ['¡Hola! 😄','Holaa 👋','¿Qué tal?','Buenas 😎'][Math.floor(Math.random()*4)];
  }

  return ['ok','mmm interesante 🤔','vale','dale 👍'][Math.floor(Math.random()*4)];
}

function sendMessage(){
  if (!activeId) return;
  const item = items.find(x=>x.id===activeId);
  if (!item) return;
  const text = msgInput.value.trim();
  if (!text) return;

  const m = { from:'me', text, time:nowStr() };
  if(!item.msgs) item.msgs=[];
  item.msgs.push(m);
  msgInput.value='';
  renderMessages(item); renderList();

  setTimeout(()=>{
    const replyText = makeBotReply(item, m.text);
    const r = { from:'bot', text:replyText, time:nowStr() };
    item.msgs.push(r);
    if(item.id===activeId) renderMessages(item);
    renderList();
  }, 400 + Math.random()*400);
}

function VoiceRecorder(onStopCallback){
  this.mediaRecorder=null;
  this.chunks=[];
  this.onStopCallback=onStopCallback;
}
VoiceRecorder.prototype.start=async function(){
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    this.mediaRecorder=new MediaRecorder(stream);
    this.chunks=[];
    this.mediaRecorder.ondataavailable=(e)=>{if(e.data.size>0)this.chunks.push(e.data)};
    this.mediaRecorder.onstop=()=>{
      const blob=new Blob(this.chunks,{type:'audio/webm'});
      this.chunks=[];
      if(typeof this.onStopCallback==='function')this.onStopCallback(blob);
      stream.getTracks().forEach(t=>t.stop());
    };
    this.mediaRecorder.start();
  }catch(err){alert('No se pudo acceder al micrófono');}
};
VoiceRecorder.prototype.stop=function(){
  if(this.mediaRecorder&&this.mediaRecorder.state==='recording'){this.mediaRecorder.stop();}
};

const voiceRecorder=new VoiceRecorder(function(blob){
  if(!activeId)return;
  const item=items.find(x=>x.id===activeId);
  const audioURL=URL.createObjectURL(blob);
  const msg={from:'me',type:'voice',audio:blob,audioURL,time:nowStr()};
  if(!item.msgs)item.msgs=[];
  item.msgs.push(msg);
  renderMessages(item); renderList();

  setTimeout(()=>{
    const respuestas=['Mmm interesante 😄','Genial 👌','Te escuché, suena bien 🎧','Vale, entendido 😉'];
    const r={from:'bot',text:respuestas[Math.floor(Math.random()*respuestas.length)],time:nowStr()};
    item.msgs.push(r);
    if(item.id===activeId)renderMessages(item);
    renderList();
  },1000);
});

let isRecording=false;
micBtn.addEventListener('click',async()=>{
  if(!isRecording){
    isRecording=true;
    micBtn.classList.add('recording');
    await voiceRecorder.start();
  }else{
    isRecording=false;
    micBtn.classList.remove('recording');
    voiceRecorder.stop();
  }
});

// === UX ===
function autoResize(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,120)+'px';
}
msgInput.addEventListener('input',()=>autoResize(msgInput));
msgInput.addEventListener('keydown',(e)=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}
});
sendBtn.addEventListener('click',sendMessage);

plusBtn.addEventListener('click',()=>plusMenu.classList.toggle('hidden'));
document.addEventListener('click',(e)=>{
  if(!plusBtn.contains(e.target)&&!plusMenu.contains(e.target)&&!ctxMenu.contains(e.target)){
    plusMenu.classList.add('hidden'); ctxMenu.classList.add('hidden');
  }
});
addUserBtn.addEventListener('click',()=>{
  const name=prompt('Nombre del nuevo chat:'); if(!name)return;
  items.push({id:uid(),type:'user',name:name.trim(),msgs:[]});
  plusMenu.classList.add('hidden'); renderList();
});
addGroupBtn.addEventListener('click',()=>{
  const name=prompt('Nombre del nuevo grupo:'); if(!name)return;
  items.push({id:uid(),type:'group',name:name.trim(),members:[],msgs:[]});
  plusMenu.classList.add('hidden'); renderList();
});
ctxDelBtn.addEventListener('click',()=>{
  if(!ctxTargetId)return;
  const it=items.find(x=>x.id===ctxTargetId);
  if(!it)return;
  const ok=confirm(`¿Eliminar "${it.name}"?`); if(!ok)return;
  items=items.filter(x=>x.id!==ctxTargetId);
  if(activeId===ctxTargetId){activeId=null;setHeader(null);messagesDiv.innerHTML='';}
  ctxTargetId=null; ctxMenu.classList.add('hidden'); renderList();
});
ctxAddBtn.addEventListener('click',()=>{
  if(!ctxTargetId)return;
  const it=items.find(x=>x.id===ctxTargetId&&x.type==='group'); if(!it)return;
  openMembersModal(it); ctxMenu.classList.add('hidden');
});

function openMembersModal(groupItem){
  groupTitle.textContent=groupItem.name;
  stagingMembers=[...(groupItem.members||[])];
  drawPills();
  backdrop.classList.remove('hidden');
  membersModal.classList.remove('hidden');
  setTimeout(()=>memberInput.focus(),20);
  saveMembers.onclick=()=>{
    groupItem.members=[...new Set(stagingMembers.map(s=>s.trim()).filter(Boolean))];
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
  const n=memberInput.value.trim(); if(!n)return;
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


renderList();
setHeader(null);
