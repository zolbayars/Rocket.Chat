import { Blaze } from 'meteor/blaze';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Template } from 'meteor/templating';
let oldRoute = '';
const parent = document.querySelector('.main-content');

FlowRouter.route('/create-channel', {
	name: 'create-channel',


	triggersEnter: [function() {
		oldRoute = FlowRouter.current().oldRoute;
	}],

	action() {

		console.log("called create-channel", FlowRouter.current());

		if (parent) {
			Blaze.renderWithData(Template.fullModal, { template: 'createChannel' }, parent);
		} else {
			BlazeLayout.render('main', { center: 'fullModal', template: 'createChannel' });
		}
	},

	triggersExit: [function() {
		Blaze.remove(Blaze.getView(document.getElementsByClassName('full-modal')[0]));
		$('.main-content').addClass('rc-old');
	}],
});

FlowRouter.route('/send-sms', {
	name: 'send-sms',


	triggersEnter: [function() {
		oldRoute = FlowRouter.current().oldRoute;
	}],

	action() {

		console.log("called send-sms", FlowRouter.current());
		if (parent) {
			Blaze.renderWithData(Template.fullModal, { template: 'sendSMS' }, parent);
		} else {
			BlazeLayout.render('main', { center: 'fullModal', template: 'sendSMS' });
		}
	},

	triggersExit: [function() {
		Blaze.remove(Blaze.getView(document.getElementsByClassName('full-modal')[0]));
		$('.main-content').addClass('rc-old');
	}],
});

Template.fullModal.events({
	'click button'() {
		console.log("oldRoute", oldRoute);
		oldRoute ? history.back() : FlowRouter.go('home');
	},
});

Template.fullModal.onRendered(function() {
	$('.main-content').removeClass('rc-old');
});
