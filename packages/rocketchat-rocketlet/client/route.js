FlowRouter.route('/rocketlet', {
	name: 'rocketlet',
	action() {
		BlazeLayout.render('main', {
			center: 'pageContainer',
			pageTitle: t('Role_Editing'),
			pageTemplate: 'rocketlet'
		});
	}});
Template.rocketlet.onRendered(function() {
	this.findAll('.rc-tabs__tab a').forEach(el => {
		if (el.href === document.location.href) {
			return el.parentElement.classList.add('active');
		}
		el.parentElement.classList.remove('active');
	});
});
