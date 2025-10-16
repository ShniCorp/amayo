(function(){
  const $ = id => document.getElementById(id);
  // Detect guildId from itemsRoot dataset when embedded, otherwise read ?guild= from query string when opened as standalone page
  const guildId = (() => {
    try{
      const root = document.getElementById('itemsRoot');
      if(root && root.dataset && root.dataset.guildId) return root.dataset.guildId;
      const p = new URLSearchParams(location.search || '');
      return p.get('guild') || '';
    }catch(e){ return ''; }
  })();

  // form elements
  const form = $('itemLabForm');
  const labKey = $('labKey');
  const labName = $('labName');
  const labCategory = $('labCategory');
  const labIcon = $('labIcon');
  const labDescription = $('labDescription');
  const labTags = $('labTags');
  const labProps = $('labProps');
  const labPreview = $('labPreview');
  const labReset = $('labReset');

  function resetForm(){ labKey.value=''; labName.value=''; labCategory.value=''; labIcon.value=''; labDescription.value=''; labTags.value=''; labProps.value='{}'; renderPreview(); }
  function renderPreview(){
    const payload = {
      key: labKey.value.trim(),
      name: labName.value.trim(),
      category: labCategory.value.trim(),
      icon: labIcon.value.trim(),
      description: labDescription.value.trim(),
      tags: labTags.value.split(',').map(s=>s.trim()).filter(Boolean),
      props: (()=>{ try{ return JSON.parse(labProps.value||'{}'); }catch(e){ return labProps.value||"{}"; } })()
    };
    labPreview.textContent = JSON.stringify(payload, null, 2);
    // update 3D preview (simple animate color based on key length)
    if(window.lab3D && typeof window.lab3D.update === 'function') window.lab3D.update(payload);
  }

  if(form){
    form.addEventListener('input', renderPreview);
    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const payload = {
        key: labKey.value.trim(),
        name: labName.value.trim(),
        category: labCategory.value.trim(),
        icon: labIcon.value.trim(),
        description: labDescription.value.trim(),
        tags: labTags.value.split(',').map(s=>s.trim()).filter(Boolean),
        props: (()=>{ try{ return JSON.parse(labProps.value||'{}'); }catch(e){ alert('JSON inválido en Props'); throw e; } })()
      };
      try{
        if(!guildId){ alert('No guildId disponible'); return; }
        const res = await fetch('/api/dashboard/' + encodeURIComponent(guildId) + '/items', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
        if(!res.ok){ alert('Error al guardar: HTTP ' + res.status); return; }
        alert('Item guardado');
        resetForm();
      }catch(e){ alert('Error guardando: ' + (e && e.message)); }
    });
    labReset.addEventListener('click', resetForm);
  }

  // Prefill when editing: detect ?edit=<id>
  (async function tryPrefill(){
    try{
      const params = new URLSearchParams(location.search || '');
      const editId = params.get('edit');
      if(!editId) return;
      // show temporary loading state
      const prev = labPreview.textContent;
      labPreview.textContent = 'Cargando item...';
      const res = await fetch('/api/dashboard/' + encodeURIComponent(guildId) + '/items/' + encodeURIComponent(editId));
      if(!res.ok){ labPreview.textContent = 'Error cargando item: HTTP ' + res.status; return; }
      const j = await res.json();
      if(!j || !j.ok || !j.item){ labPreview.textContent = 'Item no encontrado'; return; }
      const item = j.item;
      // populate fields safely
      if(labKey) labKey.value = item.key || '';
      if(labName) labName.value = item.name || '';
      if(labCategory) labCategory.value = item.category || '';
      if(labIcon) labIcon.value = item.icon || '';
      if(labDescription) labDescription.value = item.description || '';
      if(labTags) labTags.value = Array.isArray(item.tags) ? item.tags.join(',') : (item.tags||'');
      try{ labProps.value = item.props && typeof item.props === 'object' ? JSON.stringify(item.props, null, 2) : (item.props||'{}'); }catch(e){ labProps.value = '{}'; }
      renderPreview();
      // update browser history to remove query param (optional)
      try{ const u = new URL(location.href); u.searchParams.delete('edit'); window.history.replaceState({}, '', u.toString()); }catch(e){}
    }catch(e){ console.warn('prefill failed', e); }
  })();

  // minimal three.js preview
  function init3D(){
    try{
      const container = $('lab3d');
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
      camera.position.z = 5;
      const renderer = new THREE.WebGLRenderer({ antialias:true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);
      const geometry = new THREE.BoxGeometry(1.5,1.5,1.5);
      const material = new THREE.MeshStandardMaterial({ color: 0x336699 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5,5,5); scene.add(light);

      function animate(){ requestAnimationFrame(animate); cube.rotation.x += 0.01; cube.rotation.y += 0.01; renderer.render(scene, camera); }
      animate();

      window.lab3D = {
        update(payload){ try{ const k = (payload && payload.key) ? payload.key.length : 1; const c = Math.max(0.2, Math.min(1, (k%10)/10 + 0.2)); material.color.setRGB(c*0.2, c*0.5, c*0.8); }catch(e){} }
      };
      window.addEventListener('resize', ()=>{ renderer.setSize(container.clientWidth, container.clientHeight); camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); });
    }catch(e){ console.warn('3D init failed', e); }
  }

  resetForm(); renderPreview(); init3D();
})();
