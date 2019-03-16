import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { settings } from '../../../settings';
import { modal, TabBar } from '../../../ui-utils';
import { t } from '../../../utils';

Template.videoFlexTab.helpers({
	openInNewWindow() {
		return settings.get('Jitsi_Open_New_Window');
	},
});

Template.videoFlexTab.onCreated(function() {
	this.tabBar = Template.currentData().tabBar;
});

Template.videoFlexTab.onRendered(function() {
	this.api = null;

	let timeOut = null;

	const width = 'auto';
	const height = 500;

	const configOverwrite = {
		desktopSharingChromeExtId: settings.get('Jitsi_Chrome_Extension'),
	};
	const interfaceConfigOverwrite = {};

	let jitsiRoomActive = null;

	const closePanel = () => {
		// Reset things.  Should probably be handled better in closeFlex()
		$('.flex-tab').css('max-width', '');
		$('.main-content').css('right', '');

		this.tabBar.close();

		TabBar.updateButton('video', { class: '' });
	};

	modal.open({
		title: t('Video_Conference'),
		text: t('Start_video_call'),
		type: 'warning',
		showCancelButton: true,
		confirmButtonText: t('Yes'),
		cancelButtonText: t('Cancel'),
		html: false,
	}, (dismiss) => {
		if (!dismiss) {
			return closePanel();
		}
		this.timeout = null;
		this.autorun(() => {
			if (settings.get('Jitsi_Enabled')) {
				if (this.tabBar.getState() === 'opened') {
					const roomId = Session.get('openedRoom');

					const domain = settings.get('Jitsi_Domain');
					const jitsiRoom = settings.get('Jitsi_URL_Room_Prefix') + settings.get('uniqueID') + roomId;
					const noSsl = !settings.get('Jitsi_SSL');

					if (jitsiRoomActive !== null && jitsiRoomActive !== jitsiRoom) {
						jitsiRoomActive = null;

						closePanel();

						// Clean up and stop updating timeout.
						Meteor.defer(() => this.api && this.api.dispose());
						if (timeOut) {
							clearInterval(timeOut);
						}
					} else {
						jitsiRoomActive = jitsiRoom;

						TabBar.updateButton('video', { class: 'red' });

						if (settings.get('Jitsi_Open_New_Window')) {
							Meteor.call('jitsi:updateTimeout', roomId);

							timeOut = Meteor.setInterval(() => Meteor.call('jitsi:updateTimeout', roomId), 10 * 1000);
							const newWindow = window.open(`${ (noSsl ? 'http://' : 'https://') + domain }/${ jitsiRoom }`, jitsiRoom);
							const closeInterval = setInterval(() => {
								if (newWindow.closed !== false) {
									closePanel();
									clearInterval(closeInterval);
									clearInterval(timeOut);
								}
							}, 300);
							if (newWindow) {
								newWindow.focus();
							}


						// Lets make sure its loaded before we try to show it.
						} else if (typeof JitsiMeetExternalAPI !== 'undefined') {

							// Keep it from showing duplicates when re-evaluated on variable change.
							if (!$('[id^=jitsiConference]').length) {
								this.api = new JitsiMeetExternalAPI(domain, jitsiRoom, width, height, this.$('.video-container').get(0), configOverwrite, interfaceConfigOverwrite, noSsl);

								/*
								* Hack to send after frame is loaded.
								* postMessage converts to events in the jitsi meet iframe.
								* For some reason those aren't working right.
								*/
								Meteor.setTimeout(() => {
									this.api.executeCommand('displayName', [Meteor.user().name]);
								}, 5000);

								Meteor.call('jitsi:updateTimeout', roomId);

								timeOut = Meteor.setInterval(() => Meteor.call('jitsi:updateTimeout', roomId), 10 * 1000);
							}

							// Execute any commands that might be reactive.  Like name changing.
							this.api && this.api.executeCommand('displayName', [Meteor.user().name]);
						}
					}
				} else {
					TabBar.updateButton('video', { class: '' });

					// Clean up and stop updating timeout.
					if (timeOut) {
						Meteor.defer(() => this.api && this.api.dispose());
						clearInterval(timeOut);
					}
				}

			}

		});
	});
});

