Package.describe({
	name: 'rocketchat:rocketlet',
	version: '0.0.1',
	summary: 'rocketlet discovery demo'
});

Package.onUse(function(api) {
	api.use('ecmascript');
	api.use('rocketchat:lib');
	api.use('rocketchat:custom-oauth');

	api.use('kadira:flow-router', 'client');

	api.use('templating', 'client');

	api.addFiles('client/rocketlet.html', 'client');
	api.addFiles('client/route.js', 'client');
});
