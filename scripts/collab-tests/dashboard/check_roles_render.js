const ejs = require('ejs');
const path = require('path');

(async ()=>{
  try{
    const cwd = process.cwd();
    const viewsDir = path.join(cwd,'src','server','views');
    const pageFile = path.join(viewsDir,'pages','dashboard.ejs');
    const layoutFile = path.join(viewsDir,'layouts','layout.ejs');

    const mockRoles = [
      { id: '111', name: 'Admin', color: '#ff0000' },
      { id: '222', name: 'Mods', color: '#00ff00' },
    ];

    const locals = {
      appName: 'amayo',
      user: { username: 'test', id: '1' },
      guilds: [],
      selectedGuild: 'guild1',
      selectedGuildId: 'guild1',
      selectedGuildName: 'Guild One',
      guildConfig: { staff: ['111'] },
      guildRoles: mockRoles,
      useDashboardNav: true,
      hideNavbar: false,
      page: 'settings'
    };

    const pageBody = await ejs.renderFile(pageFile, locals, { async: true, views:[viewsDir] });
  const html = await ejs.renderFile(layoutFile, {...locals, body: pageBody, dashboardNav: null, navbar: null, title: 'Dashboard test', version: 'test'}, { async: true, views:[viewsDir] });

    const hasAdmin = html.indexOf('Admin') !== -1;
    const hasMods = html.indexOf('Mods') !== -1;
    const hasSwatch = html.indexOf('background:#ff0000') !== -1 || html.indexOf('background:#00ff00') !== -1;
    console.log({ hasAdmin, hasMods, hasSwatch, length: html.length });
    process.exit(hasAdmin && hasMods && hasSwatch ? 0 : 2);
  }catch(err){
    console.error(err && err.stack ? err.stack : err);
    process.exit(3);
  }
})();
