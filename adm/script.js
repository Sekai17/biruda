const $ = (s) => document.querySelector(s);
let productos = [];
let shaActual = null; // SHA del blob actual en GitHub

function uiFila(p, i){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input value="${p.id||''}" data-k="id"></td>
    <td><input value="${p.nombre||''}" data-k="nombre"></td>
    <td><textarea data-k="descripcion">${p.descripcion||''}</textarea></td>
    <td><input type="number" value="${p.precio||0}" data-k="precio"></td>
    <td><input value="${p.moneda||'ARS'}" data-k="moneda"></td>
    <td><input value="${p.imagen||''}" data-k="imagen"></td>
    <td><input type="checkbox" ${p.activo? 'checked':''} data-k="activo"></td>
    <td><input value="${(p.tags||[]).join(',')}" data-k="tags"></td>
    <td>
      <button data-i="${i}" data-act="dup">Dup</button>
      <button data-i="${i}" data-act="del">Del</button>
    </td>`;
  return tr;
}

function render(){
  const tb = $('#tabla tbody');
  tb.innerHTML = '';
  productos.forEach((p,i)=>{
    const tr = uiFila(p,i);
    tb.appendChild(tr);
  });
  tb.oninput = (e)=>{
    const td = e.target; const tr = td.closest('tr');
    const row = [...tr.parentNode.children].indexOf(tr);
    const k = td.dataset.k;
    if(k==='activo') productos[row][k] = td.checked; else if(k==='precio') productos[row][k] = Number(td.value||0);
    else if(k==='tags') productos[row][k] = td.value.split(',').map(s=>s.trim()).filter(Boolean);
    else productos[row][k] = td.value;
  };
  tb.onclick = (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const i = Number(b.dataset.i);
    if(b.dataset.act==='del'){ productos.splice(i,1); render(); }
    if(b.dataset.act==='dup'){ productos.splice(i+1,0, JSON.parse(JSON.stringify(productos[i])) ); render(); }
  };
}

async function ghFetch(path, opts={}){
  const user = $('#ghUser').value.trim();
  const repo = $('#ghRepo').value.trim();
  const token = $('#ghToken').value.trim();
  const url = `https://api.github.com/repos/${user}/${repo}/${path}`;
  const res = await fetch(url, { ...opts, headers: { 'Authorization': `token ${token}`, 'Accept':'application/vnd.github+json', ...(opts.headers||{}) } });
  if(!res.ok){
    const t = await res.text();
    throw new Error(`GitHub API ${res.status}: ${t}`);
  }
  return res.json();
}

async function cargar(){
  const branch = $('#ghBranch').value.trim() || 'main';
  const path = $('#ghPath').value.trim();
  const data = await ghFetch(`contents/${path}?ref=${branch}`);
  shaActual = data.sha;
  const raw = atob(data.content.replace(/\n/g,''));
  productos = JSON.parse(raw);
  render();
}

async function guardar(){
  const branch = $('#ghBranch').value.trim() || 'main';
  const path = $('#ghPath').value.trim();
  const nuevo = JSON.stringify(productos, null, 2);
  const body = {
    message: `chore(data): actualizar productos.json (${new Date().toISOString()})`,
    content: btoa(unescape(encodeURIComponent(nuevo))),
    sha: shaActual,
    branch
  };
  const res = await ghFetch(`contents/${path}`, { method:'PUT', body: JSON.stringify(body) });
  shaActual = res.content.sha;
  alert('Guardado y commiteado. GitHub Actions reconstruirá el sitio.');
}

$('#btnLoad').onclick = ()=> cargar().catch(e=>alert(e.message));
$('#btnSave').onclick = ()=> guardar().catch(e=>alert(e.message));
$('#btnAdd').onclick = ()=>{
  productos.push({ id: $('#n_id').value.trim(), nombre: $('#n_nombre').value.trim(), descripcion: $('#n_desc').value.trim(), precio: Number($('#n_precio').value||0), moneda: $('#n_moneda').value.trim()||'ARS', imagen: $('#n_imagen').value.trim(), activo: $('#n_activo').checked, tags: ($('#n_tags').value||'').split(',').map(s=>s.trim()).filter(Boolean) });
  render();
};

// persistencia local mínima
['ghUser','ghRepo','ghBranch','ghPath','ghToken'].forEach(id=>{
  const el = $('#'+id);
  el.value = localStorage.getItem(id) || el.value;
  el.addEventListener('input', ()=> localStorage.setItem(id, el.value));
});

