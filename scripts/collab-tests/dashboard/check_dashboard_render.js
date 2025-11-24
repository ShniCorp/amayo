const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

(async function(){
  try{
    const cwd = process.cwd();
    const viewsDir = path.join(cwd,'src','server','views');
    const pageFile = path.join(viewsDir,'pages','dashboard.ejs');
    const layoutFile = path.join(viewsDir,'layouts','layout.ejs');

    const locals = {
      appName:'amayo',
      user:{username:'collab-test',id:'1',avatar:''},
      guilds:[],
      useDashboardNav:false,
      version:'test',
      selectedGuild:null,
      title:'Dashboard collab test',
      hideNavbar:false
    };

    const pageBody = await ejs.renderFile(pageFile, locals, {async:true, views:[viewsDir]});
    const html = await ejs.renderFile(layoutFile, {...locals, body: pageBody, dashboardNav:null, navbar:null}, {async:true, views:[viewsDir]});

    const found = html.indexOf('[object Promise]') !== -1;
    const out = { ok: !found, length: html.length, foundIndex: found ? html.indexOf('[object Promise]') : -1 };

    console.log(JSON.stringify(out, null, 2));
    if(found) process.exitCode = 2;
  }catch(err){
    console.error('ERROR', err && err.stack ? err.stack : err);
    process.exitCode = 3;
  }
})();
