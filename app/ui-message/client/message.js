import { Meteor } from 'meteor/meteor';
import { Blaze } from 'meteor/blaze';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import _ from 'underscore';
import moment from 'moment';
import { DateFormat } from '../../lib';
import { renderEmoji } from '../../emoji';
import { renderMessageBody, MessageTypes, MessageAction } from '../../ui-utils';
import { settings } from '../../settings';
import { RoomRoles, UserRoles, Roles, Subscriptions, Rooms } from '../../models';
import { AutoTranslate } from '../../autotranslate';
import { hasAtLeastOnePermission } from '../../authorization';
import { callbacks } from '../../callbacks';
import { Markdown } from '../../markdown';
import { t, getUserPreference, roomTypes } from '../../utils';

async function renderPdfToCanvas(canvasId, pdfLink) {
	const isSafari = /constructor/i.test(window.HTMLElement) ||
		((p) => p.toString() === '[object SafariRemoteNotification]')(!window.safari ||
			(typeof window.safari !== 'undefined' && window.safari.pushNotification));

	if (isSafari) {
		const [, version] = /Version\/([0-9]+)/.exec(navigator.userAgent) || [null, 0];
		if (version <= 12) {
			return;
		}
	}

	if (!pdfLink || !/\.pdf$/i.test(pdfLink)) {
		return;
	}

	const canvas = document.getElementById(canvasId);
	if (!canvas) {
		return;
	}

	const pdfjsLib = await import('pdfjs-dist');
	pdfjsLib.GlobalWorkerOptions.workerSrc = `${ Meteor.absoluteUrl() }pdf.worker.min.js`;

	const loader = document.getElementById(`js-loading-${ canvasId }`);

	if (loader) {
		loader.style.display = 'block';
	}

	const pdf = await pdfjsLib.getDocument(pdfLink);
	const page = await pdf.getPage(1);
	const scale = 0.5;
	const viewport = page.getViewport(scale);
	const context = canvas.getContext('2d');
	canvas.height = viewport.height;
	canvas.width = viewport.width;
	await page.render({
		canvasContext: context,
		viewport,
	}).promise;

	if (loader) {
		loader.style.display = 'none';
	}

	canvas.style.maxWidth = '-webkit-fill-available';
	canvas.style.maxWidth = '-moz-available';
	canvas.style.display = 'block';
}

Template.message.helpers({
	encodeURI(text) {
		return encodeURI(text);
	},
	broadcast() {
		const instance = Template.instance();
		return !this.private && !this.t && this.u._id !== Meteor.userId() && instance.room && instance.room.broadcast;
	},
	isIgnored() {
		return this.ignored;
	},
	ignoredClass() {
		return this.ignored ? 'message--ignored' : '';
	},
	isDecrypting() {
		return this.e2e === 'pending';
	},
	isBot() {
		if (this.bot != null) {
			return 'bot';
		}
	},
	roleTags() {
		if (!settings.get('UI_DisplayRoles') || getUserPreference(Meteor.userId(), 'hideRoles')) {
			return [];
		}

		if (!this.u || !this.u._id) {
			return [];
		}
		const userRoles = UserRoles.findOne(this.u._id);
		const roomRoles = RoomRoles.findOne({
			'u._id': this.u._id,
			rid: this.rid,
		});
		const roles = [...(userRoles && userRoles.roles) || [], ...(roomRoles && roomRoles.roles) || []];
		return Roles.find({
			_id: {
				$in: roles,
			},
			description: {
				$exists: 1,
				$ne: '',
			},
		}, {
			fields: {
				description: 1,
			},
		});
	},
	isGroupable() {
		if (Template.instance().room.broadcast || this.groupable === false) {
			return 'false';
		}
	},
	isSequential() {
		return this.groupable !== false && !Template.instance().room.broadcast;
	},
	sequentialClass() {
		if (this.groupable !== false) {
			return 'sequential';
		}
	},
	avatarFromUsername() {
		if ((this.avatar != null) && this.avatar[0] === '@') {
			return this.avatar.replace(/^@/, '');
		}
	},
	getEmoji(emoji) {
		return renderEmoji(emoji);
	},
	getName() {
		if (this.alias) {
			return this.alias;
		}
		if (!this.u) {
			return '';
		}
		return (settings.get('UI_Use_Real_Name') && this.u.name) || this.u.username;
	},
	showUsername() {
		return this.alias || (settings.get('UI_Use_Real_Name') && this.u && this.u.name);
	},
	own() {
		if (this.u && this.u._id === Meteor.userId()) {
			return 'own';
		}
	},
	timestamp() {
		return +this.ts;
	},
	chatops() {
		if (this.u && this.u.username === settings.get('Chatops_Username')) {
			return 'chatops-message';
		}
	},
	time() {
		return DateFormat.formatTime(this.ts);
	},
	date() {
		return DateFormat.formatDate(this.ts);
	},
	isTemp() {
		if (this.temp === true) {
			return 'temp';
		}
	},
	body() {
		return Template.instance().body;
	},
	system(returnClass) {
		if (MessageTypes.isSystemMessage(this)) {
			if (returnClass) {
				return 'color-info-font-color';
			}
			return 'system';
		}
	},
	showTranslated() {
		if (settings.get('AutoTranslate_Enabled') && this.u && this.u._id !== Meteor.userId() && !MessageTypes.isSystemMessage(this)) {
			const subscription = Subscriptions.findOne({
				rid: this.rid,
				'u._id': Meteor.userId(),
			}, {
				fields: {
					autoTranslate: 1,
					autoTranslateLanguage: 1,
				},
			});
			const language = AutoTranslate.getLanguage(this.rid);
			return this.autoTranslateFetching || (subscription && subscription.autoTranslate !== this.autoTranslateShowInverse && this.translations && this.translations[language]);
		}
	},
	edited() {
		return Template.instance().wasEdited;
	},
	editTime() {
		if (Template.instance().wasEdited) {
			return DateFormat.formatDateAndTime(this.editedAt);
		}
	},
	editedBy() {
		if (!Template.instance().wasEdited) {
			return '';
		}
		// try to return the username of the editor,
		// otherwise a special "?" character that will be
		// rendered as a special avatar
		return (this.editedBy && this.editedBy.username) || '?';
	},
	canEdit() {
		const hasPermission = hasAtLeastOnePermission('edit-message', this.rid);
		const isEditAllowed = settings.get('Message_AllowEditing');
		const editOwn = this.u && this.u._id === Meteor.userId();
		if (!(hasPermission || (isEditAllowed && editOwn))) {
			return;
		}
		const blockEditInMinutes = settings.get('Message_AllowEditing_BlockEditInMinutes');
		if (blockEditInMinutes) {
			let msgTs;
			if (this.ts != null) {
				msgTs = moment(this.ts);
			}
			let currentTsDiff;
			if (msgTs != null) {
				currentTsDiff = moment().diff(msgTs, 'minutes');
			}
			return currentTsDiff < blockEditInMinutes;
		} else {
			return true;
		}
	},
	canDelete() {
		const hasPermission = hasAtLeastOnePermission('delete-message', this.rid);
		const isDeleteAllowed = settings.get('Message_AllowDeleting');
		const deleteOwn = this.u && this.u._id === Meteor.userId();
		if (!(hasPermission || (isDeleteAllowed && deleteOwn))) {
			return;
		}
		const blockDeleteInMinutes = settings.get('Message_AllowDeleting_BlockDeleteInMinutes');
		if (blockDeleteInMinutes) {
			let msgTs;
			if (this.ts != null) {
				msgTs = moment(this.ts);
			}
			let currentTsDiff;
			if (msgTs != null) {
				currentTsDiff = moment().diff(msgTs, 'minutes');
			}
			return currentTsDiff < blockDeleteInMinutes;
		} else {
			return true;
		}
	},
	showEditedStatus() {
		return settings.get('Message_ShowEditedStatus');
	},
	label() {
		if (this.i18nLabel) {
			return t(this.i18nLabel);
		} else if (this.label) {
			return this.label;
		}
	},
	hasOembed() {
		// there is no URLs, there is no template to show the oembed (oembed package removed) or oembed is not enable
		if (!(this.urls && this.urls.length > 0) || !Template.oembedBaseWidget || !settings.get('API_Embed')) {
			return false;
		}

		// check if oembed is disabled for message's sender
		if ((settings.get('API_EmbedDisabledFor') || '').split(',').map((username) => username.trim()).includes(this.u && this.u.username)) {
			return false;
		}
		return true;
	},
	reactions() {
		const userUsername = Meteor.user() && Meteor.user().username;
		return Object.keys(this.reactions || {}).map((emoji) => {
			const reaction = this.reactions[emoji];
			const total = reaction.usernames.length;
			let usernames = reaction.usernames
				.slice(0, 15)
				.map((username) => (username === userUsername ? t('You').toLowerCase() : `@${ username }`))
				.join(', ');
			if (total > 15) {
				usernames = `${ usernames } ${ t('And_more', {
					length: total - 15,
				}).toLowerCase() }`;
			} else {
				usernames = usernames.replace(/,([^,]+)$/, ` ${ t('and') }$1`);
			}
			if (usernames[0] !== '@') {
				usernames = usernames[0].toUpperCase() + usernames.substr(1);
			}
			return {
				emoji,
				count: reaction.usernames.length,
				usernames,
				reaction: ` ${ t('Reacted_with').toLowerCase() } ${ emoji }`,
				userReacted: reaction.usernames.indexOf(userUsername) > -1,
			};
		});
	},
	markUserReaction(reaction) {
		if (reaction.userReacted) {
			return {
				class: 'selected',
			};
		}
	},
	hideReactions() {
		if (_.isEmpty(this.reactions)) {
			return 'hidden';
		}
	},
	actionLinks() {
		// remove 'method_id' and 'params' properties
		return _.map(this.actionLinks, function(actionLink, key) {
			return _.extend({
				id: key,
			}, _.omit(actionLink, 'method_id', 'params'));
		});
	},
	hideActionLinks() {
		if (_.isEmpty(this.actionLinks)) {
			return 'hidden';
		}
	},
	injectIndex(data, index) {
		data.index = index;
	},
	hideCog() {
		const subscription = Subscriptions.findOne({
			rid: this.rid,
		});
		if (subscription == null) {
			return 'hidden';
		}
	},
	channelName() {
		const subscription = Subscriptions.findOne({ rid: this.rid });
		return subscription && subscription.name;
	},
	roomIcon() {
		const room = Session.get(`roomData${ this.rid }`);
		if (room && room.t === 'd') {
			return 'at';
		}
		return roomTypes.getIcon(room);
	},
	fromSearch() {
		return this.customClass === 'search';
	},
	actionContext() {
		return this.actionContext;
	},
	messageActions(group) {
		let messageGroup = group;
		let context = this.actionContext;

		if (!group) {
			messageGroup = 'message';
		}

		if (!context) {
			context = 'message';
		}

		return MessageAction.getButtons(Template.currentData(), context, messageGroup);
	},
	isSnippet() {
		return this.actionContext === 'snippeted';
	},
});


Template.message.onCreated(function() {
	let msg = Template.currentData();

	this.wasEdited = (msg.editedAt != null) && !MessageTypes.isSystemMessage(msg);

	this.room = Rooms.findOne({
		_id: msg.rid,
	}, {
		fields: {
			broadcast: 1,
		},
	});

	return this.body = (() => {
		const isSystemMessage = MessageTypes.isSystemMessage(msg);
		const messageType = MessageTypes.getType(msg) || {};
		if (messageType.render) {
			msg = messageType.render(msg);
		} else if (messageType.template) {
			// render template
		} else if (messageType.message) {
			if (typeof messageType.data === 'function' && messageType.data(msg)) {
				msg = TAPi18n.__(messageType.message, messageType.data(msg));
			} else {
				msg = TAPi18n.__(messageType.message);
			}
		} else if (msg.u && msg.u.username === settings.get('Chatops_Username')) {
			msg.html = msg.msg;
			msg = callbacks.run('renderMentions', msg);
			msg = msg.html;
		} else {
			msg = renderMessageBody(msg);
		}

		if (isSystemMessage) {
			msg.html = Markdown.parse(msg.html);
		}
		return msg;
	})();
});

Template.message.onViewRendered = function(context) {
	return this._domrange.onAttached((domRange) => {
		if (context.file && context.file.type === 'application/pdf') {
			Meteor.defer(() => { renderPdfToCanvas(context.file._id, context.attachments[0].title_link); });
		}
		const currentNode = domRange.lastNode();
		const currentDataset = currentNode.dataset;
		const getPreviousSentMessage = (currentNode) => {
			if ($(currentNode).hasClass('temp')) {
				return currentNode.previousElementSibling;
			}
			if (currentNode.previousElementSibling != null) {
				let previousValid = currentNode.previousElementSibling;
				while (previousValid != null && $(previousValid).hasClass('temp')) {
					previousValid = previousValid.previousElementSibling;
				}
				return previousValid;
			}
		};
		const previousNode = getPreviousSentMessage(currentNode);
		const nextNode = currentNode.nextElementSibling;
		const $currentNode = $(currentNode);
		const $nextNode = $(nextNode);
		if (previousNode == null) {
			$currentNode.addClass('new-day').removeClass('sequential');
		} else if (previousNode.dataset) {
			const previousDataset = previousNode.dataset;
			const previousMessageDate = new Date(parseInt(previousDataset.timestamp));
			const currentMessageDate = new Date(parseInt(currentDataset.timestamp));
			if (previousMessageDate.toDateString() !== currentMessageDate.toDateString()) {
				$currentNode.addClass('new-day').removeClass('sequential');
			} else {
				$currentNode.removeClass('new-day');
			}
			if (previousDataset.groupable === 'false' || currentDataset.groupable === 'false') {
				$currentNode.removeClass('sequential');
			} else if (previousDataset.username !== currentDataset.username || parseInt(currentDataset.timestamp) - parseInt(previousDataset.timestamp) > settings.get('Message_GroupingPeriod') * 1000) {
				$currentNode.removeClass('sequential');
			} else if (!$currentNode.hasClass('new-day')) {
				$currentNode.addClass('sequential');
			}
		}
		if (nextNode && nextNode.dataset) {
			const nextDataset = nextNode.dataset;
			if (nextDataset.date !== currentDataset.date) {
				$nextNode.addClass('new-day').removeClass('sequential');
			} else {
				$nextNode.removeClass('new-day');
			}
			if (nextDataset.groupable !== 'false') {
				if (nextDataset.username !== currentDataset.username || parseInt(nextDataset.timestamp) - parseInt(currentDataset.timestamp) > settings.get('Message_GroupingPeriod') * 1000) {
					$nextNode.removeClass('sequential');
				} else if (!$nextNode.hasClass('new-day') && !$currentNode.hasClass('temp')) {
					$nextNode.addClass('sequential');
				}
			}
		}
		if (nextNode == null) {
			const [el] = $(`#chat-window-${ context.rid }`);
			const view = el && Blaze.getView(el);
			const templateInstance = view && view.templateInstance();
			if (!templateInstance) {
				return;
			}

			if (currentNode.classList.contains('own') === true) {
				templateInstance.atBottom = true;
			}
			templateInstance.sendToBottomIfNecessary();
		}
	});
};
