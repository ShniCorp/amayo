const ejs = require('../node_modules/ejs');
const path = require('path');
(async () => {
  try {
    const viewsRoot = path.join(process.cwd(), 'src', 'server', 'views');
    const layoutPath = path.join(viewsRoot, 'layouts', 'layout.ejs');

    // Dashboard (should NOT include navbar)
    const dashboardPage = await ejs.renderFile(
      path.join(viewsRoot, 'pages', 'dashboard.ejs'),
      {
        user: { id: '123', username: 'tester', avatar: '' },
        guilds: [{ id: '1', name: 'G1' }],
        botAvailable: true,
        selectedGuildId: '1',
      },
      { async: true, views: [viewsRoot] }
    );
    const dashboardHtml = await ejs.renderFile(
      layoutPath,
      {
        appName: 'Amayo',
        version: '2.0.0',
        body: dashboardPage,
        hideNavbar: true,
        useDashboardNav: false,
        dashboardNav: null,
        navbar: null,
        session: { user: { id: '123', username: 'tester', avatar: '' } },
        selectedGuildName: 'G1',
        selectedGuildId: '1',
      },
      { async: true, views: [viewsRoot] }
    );

    // Labs (should INCLUDE dashboard nav)
    const labsPage = await ejs.renderFile(
      path.join(viewsRoot, 'pages', 'labs.ejs'),
      { selectedGuildName: 'G1', selectedGuildId: '1' },
      { async: true, views: [viewsRoot] }
    );
    const labsHtml = await ejs.renderFile(
      layoutPath,
      {
        appName: 'Amayo',
        version: '2.0.0',
        body: labsPage,
        hideNavbar: false,
        useDashboardNav: true,
        session: { user: { id: '123', username: 'tester', avatar: '' } },
        selectedGuildName: 'G1',
        selectedGuildId: '1',
      },
      { async: true, views: [viewsRoot] }
    );

    const dashHasNav = Boolean(dashboardHtml.match(/<nav[^>]*>/i));
    const labsHasNav = Boolean(labsHtml.match(/<nav[^>]*>/i));
    const labsHasGuild = labsHtml.includes('G1');

    console.log('DASHBOARD_HAS_NAV:' + dashHasNav);
    console.log('LABS_HAS_NAV:' + labsHasNav);
    console.log('LABS_INCLUDES_GUILD:' + labsHasGuild);
    console.log('\n--- DASHBOARD SNIPPET ---\n');
    console.log(dashboardHtml.slice(0, 800));
    console.log('\n--- LABS SNIPPET ---\n');
    console.log(labsHtml.slice(0, 800));
  } catch (err) {
    console.error('RENDER_CHECK_ERROR', err);
    process.exit(1);
  }
})();

