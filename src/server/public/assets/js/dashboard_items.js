(function(){
  // read guildId from DOM data- attribute (keeps this script EJS-free)
  const guildId = (() => { try{ return (document.getElementById('itemsRoot') && document.getElementById('itemsRoot').dataset && document.getElementById('itemsRoot').dataset.guildId) || ''; }catch(e){ return ''; } })();

  const $ = id => document.getElementById(id);
  const _escapeMap = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"};
  const escapeHtml = s => { if (s==null) return ''; return String(s).replace(/[&<>"']/g, ch => _escapeMap[ch]); };

  function showPageAlert(type, msg, ttl){
    const c = $('pageAlert'); if(!c) return;
    c.classList.remove('hidden'); c.innerHTML = '';
    const wrapper = document.createElement('div');
    const color = (type === 'success') ? 'bg-green-600' : (type === 'danger') ? 'bg-red-700' : (type === 'warning') ? 'bg-amber-700' : 'bg-sky-600';
    wrapper.className = ['p-3','rounded',color,'text-white','flex','items-center','justify-between'].join(' ');
    const txt = document.createElement('div'); txt.textContent = msg || '';
    const btn = document.createElement('button'); btn.id = 'pageAlertClose'; btn.className = 'ml-4 font-bold'; btn.textContent = '✕';
    btn.addEventListener('click', ()=>{ c.classList.add('hidden'); c.innerHTML = ''; });
    wrapper.appendChild(txt); wrapper.appendChild(btn); c.appendChild(wrapper);
    if (ttl) setTimeout(()=>{ c.classList.add('hidden'); c.innerHTML = ''; }, ttl);
  }
  function clearPageAlert(){ const c = $('pageAlert'); if(c){ c.classList.add('hidden'); c.innerHTML=''; } }

  function setModalError(msg){ const e = $('modalError'); if(!e) return; e.textContent = msg||''; e.classList.toggle('hidden', !msg); }
  function clearModalError(){ setModalError(''); }

  let cachedItems = [];
  const list = $('itemsList');

  async function fetchItems(){
    if(!guildId){ showPageAlert('warning','No hay servidor seleccionado. Selecciona un servidor o inicia sesión.'); return; }
    if(list) list.textContent = 'Cargando items...';
    try{
      const res = await fetch('/api/dashboard/' + encodeURIComponent(guildId) + '/items', { headers:{ 'Accept':'application/json' } });
      if(!res.ok){
        // Show helpful message depending on status
        if(res.status === 401) { showPageAlert('danger','No autenticado. Inicia sesión y vuelve a intentarlo.'); }
        else if(res.status === 403) { showPageAlert('danger','No tienes permisos para ver items en este servidor.'); }
        else { showPageAlert('danger','Error al cargar items (HTTP ' + res.status + ')'); }
        if(list) list.innerHTML = '<div class="text-red-400">Error cargando items: HTTP ' + res.status + '</div>';
        try{ const errBody = await res.text(); console.debug('items fetch non-ok body:', errBody); }catch(e){}
        return;
      }
      const j = await res.json(); if(!j || !j.ok) { showPageAlert('danger','Respuesta inválida del servidor al listar items'); if(list) list.innerHTML = '<div class="text-red-400">Respuesta inválida del servidor</div>'; return; }
      cachedItems = j.items || [];
      renderList(cachedItems);
    }catch(err){ if(list) list.innerHTML = '<div class="text-red-400">Error cargando items</div>'; }
  }

  function renderList(items){
    if(!list) return; list.innerHTML = '';
    if(!Array.isArray(items) || items.length===0){ list.innerHTML = '<div class="text-white/60">No hay items definidos.</div>'; return; }
    items.forEach(it => {
      const card = document.createElement('div'); card.className = 'p-3 bg-[#071a2a] rounded flex items-start justify-between';
      const left = document.createElement('div');
      // build left column using DOM to avoid inline HTML/template complexity
      const titleDiv = document.createElement('div');
      titleDiv.className = 'text-white font-medium';
      titleDiv.textContent = (it.name || '') + ' (' + (it.key || '') + ')';
      const descDiv = document.createElement('div');
      descDiv.className = 'text-white/60 text-sm mt-1';
      descDiv.textContent = it.description || '';
      left.appendChild(titleDiv);
      left.appendChild(descDiv);
      const right = document.createElement('div');
      right.className = 'flex items-center gap-2';
      const editBtn = document.createElement('button');
      editBtn.className = 'editBtn px-2 py-1 bg-indigo-600 rounded text-white text-sm';
      editBtn.textContent = 'Editar';
      editBtn.dataset.id = it.id;
      const delBtn = document.createElement('button');
      delBtn.className = 'delBtn px-2 py-1 bg-red-600 rounded text-white text-sm';
      delBtn.textContent = 'Eliminar';
      delBtn.dataset.id = it.id;
      right.appendChild(editBtn); right.appendChild(delBtn);
      card.appendChild(left); card.appendChild(right); list.appendChild(card);
    });
    Array.from(list.querySelectorAll('.editBtn')).forEach(b=>b.addEventListener('click', onEdit));
    Array.from(list.querySelectorAll('.delBtn')).forEach(b=>b.addEventListener('click', onDelete));
  }

  // rewards helpers
  function getCurrentRewards(){ try{ const r = $('rewardsList'); return r && r.dataset && r.dataset.rewards ? JSON.parse(r.dataset.rewards) : []; }catch(e){ return []; } }
  function setCurrentRewards(arr){ const r = $('rewardsList'); if(!r) return; r.dataset.rewards = JSON.stringify(arr||[]); }
  function renderRewardsList(arr){ const container = $('rewardsList'); if(!container) return; container.innerHTML = ''; if(!Array.isArray(arr) || arr.length===0) return; arr.forEach((it,idx)=>{ const row = document.createElement('div'); row.className='flex items-center gap-2'; if(it.coins || it.type==='coins'){ row.innerHTML = '<div class="text-white/80">Coins: <strong class="text-white">' + escapeHtml(String(it.coins||it.amount||0)) + '</strong></div>'; } else if(it.items || it.itemKey){ const key = it.itemKey || (it.items && it.items[0] && it.items[0].key) || ''; const qty = it.quantity || (it.items && it.items[0] && it.items[0].quantity) || 1; row.innerHTML = '<div class="text-white/80">Item: <strong class="text-white">' + escapeHtml(key) + '</strong> x' + escapeHtml(String(qty)) + '</div>'; } else { row.innerHTML = '<div class="text-white/80">' + escapeHtml(JSON.stringify(it)) + '</div>'; } const del = document.createElement('button'); del.className='px-2 py-1 bg-red-600 text-white rounded text-sm ml-2'; del.textContent='Eliminar'; del.addEventListener('click', ()=>{ const cur = getCurrentRewards(); cur.splice(idx,1); setCurrentRewards(cur); renderRewardsList(cur); }); row.appendChild(del); container.appendChild(row); }); }

  // small handlers
  const addRewardBtn = $('addRewardBtn'); if(addRewardBtn) addRewardBtn.addEventListener('click', ()=>{
    clearModalError(); const type = $('newRewardType') ? $('newRewardType').value : 'items'; const amtRaw = $('newRewardAmount') ? $('newRewardAmount').value : ''; const amt = Number(amtRaw); const key = $('newRewardItemKey') ? $('newRewardItemKey').value.trim() : ''; const cur = getCurrentRewards();
    if(type==='coins'){ if(!amtRaw || isNaN(amt) || amt<=0){ setModalError('Cantidad de coins debe ser mayor a 0'); return; } cur.push({ coins: amt }); }
    else { if(!key){ setModalError('item.key requerido'); return; } if(!amtRaw || isNaN(amt) || amt<=0){ setModalError('Cantidad de item debe ser mayor a 0'); return; } cur.push({ items:[{ key, quantity: amt||1 }] }); }
    setCurrentRewards(cur); renderRewardsList(cur); if($('newRewardAmount')) $('newRewardAmount').value=''; if($('newRewardItemKey')) $('newRewardItemKey').value=''; clearModalError();
  });
  const newRewardType = $('newRewardType'); if(newRewardType) newRewardType.addEventListener('change', ()=>{ const k = $('newRewardItemKey'); if(!k) return; if(newRewardType.value==='coins'){ k.disabled = true; k.classList.add('opacity-50'); } else { k.disabled = false; k.classList.remove('opacity-50'); } });

  async function tryLoadRawProps(id){ const msg = $('loadRawMsg'); if(!id) return null; if(msg) msg.textContent = 'cargando...'; try{ const res = await fetch('/api/dashboard/' + encodeURIComponent(guildId) + '/items/' + encodeURIComponent(id) + '/raw', { headers:{ 'Accept':'application/json' } }); if(!res.ok){ if(msg) msg.textContent = 'error'; return null; } const j = await res.json(); if(!j || !j.ok){ if(msg) msg.textContent = 'no data'; return null; } if(msg) msg.textContent = 'raw cargado'; return j.item || null; }catch(e){ if(msg) msg.textContent = 'error'; return null; } }

  async function onEdit(e){ clearModalError(); const id = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.id : null; if(!id) return; let item = (cachedItems.find(x=>String(x.id)===String(id))||null);
    if(!item){ try{ const res = await fetch('/api/dashboard/' + encodeURIComponent(guildId) + '/items/' + encodeURIComponent(id)); if(!res.ok) throw new Error('fetch'); const j = await res.json(); if(j && j.ok) { item = j.item; cachedItems.push(item); } }catch(err){ setModalError('Error cargando item'); return; } }
    if(!item) return setModalError('Item no encontrado');
    // map fields
    if($('itemId')) $('itemId').value = item.id || '';
    if($('fieldKey')) $('fieldKey').value = item.key || '';
    if($('fieldName')) $('fieldName').value = item.name || '';
    if($('fieldCategory')) $('fieldCategory').value = item.category || '';
    if($('fieldIcon')) $('fieldIcon').value = item.icon || '';
    if($('fieldDescription')) $('fieldDescription').value = item.description || '';
    if($('fieldTags')) $('fieldTags').value = Array.isArray(item.tags)?item.tags.join(','):item.tags||'';
    if($('fieldMaxPer')) $('fieldMaxPer').value = item.maxPerInventory||'';
    const p = item.props || {};
    try{
      if($('propCraftable')) $('propCraftable').checked = !!p.craftable;
      if($('propRecipeKey')) $('propRecipeKey').value = p.recipe && p.recipe.key ? p.recipe.key : '';
      if($('propEquipable')) $('propEquipable').checked = !!p.equipable;
      if($('propSlot')) $('propSlot').value = p.slot || '';
      if($('propAttack')) $('propAttack').value = p.attack || '';
      if($('propDefense')) $('propDefense').value = p.defense || '';
      if($('propDurability')) $('propDurability').value = p.durability || '';
      if($('propMaxDurability')) $('propMaxDurability').value = p.maxDurability || '';
      if($('propToolType')) $('propToolType').value = (p.tool && p.tool.type) ? p.tool.type : '';
      if($('propToolTier')) $('propToolTier').value = (p.tool && typeof p.tool.tier !== 'undefined') ? String(p.tool.tier) : '';
      if($('propBreakable')) $('propBreakable').checked = !!(p.breakable && p.breakable.enabled);
      if($('propDurabilityPerUse')) $('propDurabilityPerUse').value = (p.breakable && p.breakable.durabilityPerUse) ? String(p.breakable.durabilityPerUse) : '';
      if($('propUsable')) $('propUsable').checked = !!p.usable;
      if($('propPurgeAllEffects')) $('propPurgeAllEffects').checked = !!p.purgeAllEffects;
      if($('propHealAmount')) $('propHealAmount').value = p.heal || '';
      if($('propDamage')) $('propDamage').value = p.damage || '';
      if($('propDamageBonus')) $('propDamageBonus').value = p.damageBonus || '';
      if($('statAttack')) $('statAttack').value = p.stats && typeof p.stats.attack !== 'undefined' ? String(p.stats.attack) : '';
      if($('statHp')) $('statHp').value = p.stats && typeof p.stats.hp !== 'undefined' ? String(p.stats.hp) : '';
      if($('statDefense')) $('statDefense').value = p.stats && typeof p.stats.defense !== 'undefined' ? String(p.stats.defense) : '';
      if($('statXpReward')) $('statXpReward').value = p.stats && typeof p.stats.xpReward !== 'undefined' ? String(p.stats.xpReward) : '';
      if($('reqToolRequired')) $('reqToolRequired').checked = !!(p.requirements && p.requirements.tool && p.requirements.tool.required);
      if($('reqToolType')) $('reqToolType').value = (p.requirements && p.requirements.tool && p.requirements.tool.toolType) ? p.requirements.tool.toolType : '';
      if($('reqMinTier')) $('reqMinTier').value = (p.requirements && p.requirements.tool && typeof p.requirements.tool.minTier !== 'undefined') ? String(p.requirements.tool.minTier) : '';
      if($('propSellPrice')) $('propSellPrice').value = p.sellPrice || '';
      if($('propBuyPrice')) $('propBuyPrice').value = p.buyPrice || '';
      if($('propChestEnabled')) $('propChestEnabled').checked = !!(p.chest && p.chest.enabled);
      const rewards = p.chest && p.chest.rewards ? p.chest.rewards : [];
      setCurrentRewards(rewards||[]); renderRewardsList(rewards||[]);
      if($('propCustomJson')){ const copy = Object.assign({}, p); ['craftable','recipe','equipable','slot','attack','defense','durability','maxDurability'].forEach(k=>delete copy[k]); $('propCustomJson').value = JSON.stringify(copy, null, 2); }
    }catch(e){}
    const m = item.metadata || {};
    if($('metaRarity')) $('metaRarity').value = m.rarity || 'common';
    if($('metaWeight')) $('metaWeight').value = typeof m.weight !== 'undefined' ? String(m.weight) : '';
    if($('metaCustomJson')){ const copyM = Object.assign({}, m); delete copyM.rarity; delete copyM.weight; $('metaCustomJson').value = JSON.stringify(copyM, null, 2); }
    renderTagChips();
    if($('modalTitle')) $('modalTitle').textContent = 'Editar item';
    if($('itemModal')){ $('itemModal').classList.remove('hidden'); $('itemModal').classList.add('flex'); }
  }

  async function onDelete(e){ const id = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.id : null; if(!id) return; if(!confirm('Eliminar item?')) return; try{ const res = await fetch('/api/dashboard/' + encodeURIComponent(guildId) + '/items/' + encodeURIComponent(id), { method:'DELETE' }); if(!res.ok) throw new Error('delete-failed'); await fetchItems(); showPageAlert('success','Item eliminado',3000); }catch(err){ showPageAlert('danger','Error al eliminar'); } }

  // create/cancel
  const createBtn = $('createItemBtn'); if(createBtn) createBtn.addEventListener('click', ()=>{ clearModalError(); resetFormForCreate(); if($('modalTitle')) $('modalTitle').textContent = 'Crear item'; if($('itemModal')){ $('itemModal').classList.remove('hidden'); $('itemModal').classList.add('flex'); } });
  const cancelBtn = $('cancelItemBtn'); if(cancelBtn) cancelBtn.addEventListener('click', ()=>{ clearModalError(); if($('itemModal')){ $('itemModal').classList.add('hidden'); $('itemModal').classList.remove('flex'); } });

  function resetFormForCreate(){ try{ const ids = ['itemId','fieldKey','fieldName','fieldCategory','fieldIcon','fieldDescription','fieldTags','fieldMaxPer']; ids.forEach(id=>{ const e=$(id); if(e) e.value=''; }); const checks = ['propCraftable','propEquipable','propBreakable','propUsable','propPurgeAllEffects','propChestEnabled','reqToolRequired']; checks.forEach(id=>{ const e=$(id); if(e && e.type==='checkbox') e.checked=false; }); if($('propCustomJson')) $('propCustomJson').value='{}'; if($('metaCustomJson')) $('metaCustomJson').value='{}'; setCurrentRewards([]); renderRewardsList([]); renderTagChips(); }catch(e){}
  }

  // tag chips
  const tagsChips = document.createElement('div'); tagsChips.id='tagsChips'; tagsChips.className='mt-2 flex flex-wrap gap-2'; if($('fieldTags') && $('fieldTags').parentNode) $('fieldTags').parentNode.appendChild(tagsChips);
  function renderTagChips(){ try{ const base = $('fieldTags') && $('fieldTags').value ? $('fieldTags').value.split(',').map(s=>s.trim()).filter(Boolean) : []; const auto=[]; if($('propCraftable') && $('propCraftable').checked) auto.push('craftable'); if($('propToolType') && $('propToolType').value.trim()) auto.push('tool'); if(($('propDamage') && $('propDamage').value.trim())||($('propAttack') && $('propAttack').value.trim())) auto.push('weapon'); if($('propUsable') && $('propUsable').checked) auto.push('consumable'); if($('propEquipable') && $('propEquipable').checked) auto.push('equipable'); if($('propChestEnabled') && $('propChestEnabled').checked) auto.push('chest'); if($('propBreakable') && $('propBreakable').checked) auto.push('breakable'); if($('propSellPrice') && $('propSellPrice').value.trim()) auto.push('sellable'); if($('propBuyPrice') && $('propBuyPrice').value.trim()) auto.push('buyable'); const merged = Array.from(new Set([...(base||[]), ...auto])); tagsChips.innerHTML=''; merged.forEach(t=>{ const chip = document.createElement('span'); chip.className='px-2 py-1 rounded bg-white/6 text-sm text-white'; chip.textContent = t; tagsChips.appendChild(chip); }); }catch(e){}
  ['propCraftable','propToolType','propDamage','propAttack','propUsable','propEquipable','propChestEnabled','propBreakable','propSellPrice','propBuyPrice','fieldTags'].forEach(id=>{ const e=$(id); if(!e) return; e.addEventListener('input', renderTagChips); e.addEventListener('change', renderTagChips); });

  // form submit
  const form = $('itemForm'); if(form) form.addEventListener('submit', async ev=>{
    ev.preventDefault(); clearModalError(); try{
      const id = $('itemId') ? $('itemId').value : '';
      const parsedProps = {};
      if($('propCraftable') && $('propCraftable').checked){ parsedProps.craftable = true; const rk = $('propRecipeKey') ? $('propRecipeKey').value.trim() : ''; if(rk) parsedProps.recipe = { key: rk }; }
      if($('propEquipable') && $('propEquipable').checked){ parsedProps.equipable = true; const slot = $('propSlot') ? $('propSlot').value : ''; if(slot) parsedProps.slot = slot; }
      const ttype = $('propToolType') ? $('propToolType').value.trim() : ''; const ttier = $('propToolTier') ? $('propToolTier').value.trim() : ''; if(ttype) parsedProps.tool = Object.assign({}, parsedProps.tool||{}, { type: ttype }); if(ttier) parsedProps.tool = Object.assign({}, parsedProps.tool||{}, { tier: Number(ttier) });
      if($('propBreakable') && $('propBreakable').checked){ parsedProps.breakable = parsedProps.breakable||{}; parsedProps.breakable.enabled = true; const dpu = $('propDurabilityPerUse') ? $('propDurabilityPerUse').value.trim() : ''; if(dpu) parsedProps.breakable.durabilityPerUse = Number(dpu); }
      const attack = $('propAttack') ? $('propAttack').value.trim() : ''; if(attack) parsedProps.attack = Number(attack);
      const defense = $('propDefense') ? $('propDefense').value.trim() : ''; if(defense) parsedProps.defense = Number(defense);
      const durability = $('propDurability') ? $('propDurability').value.trim() : ''; if(durability) parsedProps.durability = Number(durability);
      const maxDur = $('propMaxDurability') ? $('propMaxDurability').value.trim() : ''; if(maxDur) parsedProps.maxDurability = Number(maxDur);
      if($('propUsable') && $('propUsable').checked){ parsedProps.usable = true; if($('propPurgeAllEffects') && $('propPurgeAllEffects').checked) parsedProps.purgeAllEffects = true; const heal = $('propHealAmount') ? $('propHealAmount').value.trim() : ''; if(heal) parsedProps.heal = Number(heal); }
      const dmg = $('propDamage') ? $('propDamage').value.trim() : ''; if(dmg) parsedProps.damage = Number(dmg);
      const dmgBonus = $('propDamageBonus') ? $('propDamageBonus').value.trim() : ''; if(dmgBonus) parsedProps.damageBonus = Number(dmgBonus);
      const sAtk = $('statAttack') ? $('statAttack').value.trim() : ''; if(sAtk) { parsedProps.stats = parsedProps.stats||{}; parsedProps.stats.attack = Number(sAtk); }
      const sHp = $('statHp') ? $('statHp').value.trim() : ''; if(sHp) { parsedProps.stats = parsedProps.stats||{}; parsedProps.stats.hp = Number(sHp); }
      const sDef = $('statDefense') ? $('statDefense').value.trim() : ''; if(sDef) { parsedProps.stats = parsedProps.stats||{}; parsedProps.stats.defense = Number(sDef); }
      const sXp = $('statXpReward') ? $('statXpReward').value.trim() : ''; if(sXp) { parsedProps.stats = parsedProps.stats||{}; parsedProps.stats.xpReward = Number(sXp); }
      if($('reqToolRequired') && $('reqToolRequired').checked){ parsedProps.requirements = parsedProps.requirements||{}; parsedProps.requirements.tool = { required: true }; const rtype = $('reqToolType') ? $('reqToolType').value.trim() : ''; if(rtype) parsedProps.requirements.tool.toolType = rtype; const rmin = $('reqMinTier') ? $('reqMinTier').value.trim() : ''; if(rmin) parsedProps.requirements.tool.minTier = Number(rmin); }
      const sell = $('propSellPrice') ? $('propSellPrice').value.trim() : ''; if(sell) parsedProps.sellPrice = Number(sell);
      const buy = $('propBuyPrice') ? $('propBuyPrice').value.trim() : ''; if(buy) parsedProps.buyPrice = Number(buy);
      if($('propChestEnabled') && $('propChestEnabled').checked){ parsedProps.chest = parsedProps.chest||{}; parsedProps.chest.enabled = true; }
      try{ const rawRewards = $('rewardsList') ? $('rewardsList').dataset.rewards : null; const rewards = rawRewards ? JSON.parse(rawRewards) : null; if(Array.isArray(rewards)) parsedProps.chest = Object.assign(parsedProps.chest||{}, { rewards }); }catch(e){ setModalError('JSON inválido en Drops/Chest: ' + (e && e.message ? e.message : String(e))); return; }
      try{ const custom = $('propCustomJson') ? JSON.parse($('propCustomJson').value || '{}') : {}; if(custom && typeof custom === 'object') Object.assign(parsedProps, custom); }catch(e){ setModalError('JSON inválido en Props personalizado: ' + (e && e.message ? e.message : String(e))); return; }

      const parsedMeta = { rarity: ($('metaRarity') ? $('metaRarity').value : 'common') };
      const w = $('metaWeight') ? $('metaWeight').value.trim() : ''; if(w) parsedMeta.weight = Number(w);
      try{ const customM = $('metaCustomJson') ? JSON.parse($('metaCustomJson').value || '{}') : {}; if(customM && typeof customM === 'object') Object.assign(parsedMeta, customM); }catch(e){ setModalError('JSON inválido en Metadata personalizado: ' + (e && e.message ? e.message : String(e))); return; }

      const payload = {
        key: ($('fieldKey') ? $('fieldKey').value.trim() : ''),
        name: ($('fieldName') ? $('fieldName').value.trim() : ''),
        category: ($('fieldCategory') ? $('fieldCategory').value.trim() : ''),
        icon: ($('fieldIcon') ? $('fieldIcon').value.trim() : ''),
        description: ($('fieldDescription') ? $('fieldDescription').value.trim() : ''),
        tags: ($('fieldTags') ? $('fieldTags').value.split(',').map(s=>s.trim()).filter(Boolean) : []),
        maxPerInventory: ($('fieldMaxPer') ? Number($('fieldMaxPer').value) || null : null),
        props: Object.keys(parsedProps).length ? parsedProps : null,
        metadata: Object.keys(parsedMeta).length ? parsedMeta : null,
      };
      try{ const auto = new Set(payload.tags || []); if(parsedProps.craftable) auto.add('craftable'); if(parsedProps.tool) auto.add('tool'); if(parsedProps.damage||parsedProps.attack||parsedProps.stats) auto.add('weapon'); if(parsedProps.usable) auto.add('consumable'); if(parsedProps.equipable) auto.add('equipable'); if(parsedProps.chest) auto.add('chest'); if(parsedProps.breakable) auto.add('breakable'); if(parsedProps.sellPrice) auto.add('sellable'); if(parsedProps.buyPrice) auto.add('buyable'); payload.tags = Array.from(auto).filter(Boolean); }catch(e){}

      try{
        if(id){ const res = await fetch('/api/dashboard/' + encodeURIComponent(guildId) + '/items/' + encodeURIComponent(id), { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) }); if(!res.ok) throw new Error('save-failed'); }
        else { const res = await fetch('/api/dashboard/' + encodeURIComponent(guildId) + '/items', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) }); if(!res.ok) throw new Error('create-failed'); }
        if($('itemModal')){ $('itemModal').classList.add('hidden'); $('itemModal').classList.remove('flex'); }
        clearModalError(); await fetchItems();
      }catch(e){ setModalError('Error al guardar item. ¿JSON válido en Props/Metadata?'); }
    }catch(e){ setModalError('Error interno: ' + (e && e.message ? e.message : String(e))); }
  });

  // initial
  fetchItems();
}})()
