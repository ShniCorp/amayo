(async()=>{
  try{
    const ejs=require('ejs'), path=require('path');
    const viewsDir=path.join(process.cwd(),'src','server','views');
    const pageFile = path.join(viewsDir,'pages','dashboard.ejs');
    const layoutFile = path.join(viewsDir,'layouts','layout.ejs');
  const locals={ appName:'amayo', user:{username:'test',id:'1',avatar:''}, guilds:[], useDashboardNav:false, version:'x', selectedGuild: null, title:'Dashboard test', hideNavbar:false };
    console.log('render page');
    const pageBody = await ejs.renderFile(pageFile, locals, {async:true, views:[viewsDir]});
    console.log('pageBody type:', typeof pageBody);
  const html = await ejs.renderFile(layoutFile, {...locals, body: pageBody, dashboardNav:null, navbar:null, title: locals.title, useDashboardNav: locals.useDashboardNav}, {async:true, views:[viewsDir]});
    console.log('html length', html.length);
    if (html.indexOf('[object Promise]')!==-1){ console.log('FOUND at', html.indexOf('[object Promise]')); console.log(html.slice(0,200)); process.exit(3);} 
    console.log('OK NO PROMISE'); process.exit(0);
  }catch(e){ console.error('ERR',e); process.exit(2);} 
})();