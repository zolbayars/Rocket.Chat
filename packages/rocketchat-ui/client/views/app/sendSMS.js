import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { Blaze } from 'meteor/blaze';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Template } from 'meteor/templating';
import { AutoComplete } from 'meteor/mizzao:autocomplete';
import { settings } from 'meteor/rocketchat:settings';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { t, roomTypes } from 'meteor/rocketchat:utils';
import { hasAllPermission } from 'meteor/rocketchat:authorization';
import { TAPi18n } from 'meteor/tap:i18n';
import { Session } from 'meteor/session'
import toastr from 'toastr';
import _ from 'underscore';

// const acEvents = {
// 	'click .rc-popup-list__item'(e, t) {
// 		t.ac.onItemClick(this, e);
// 	},
// 	'keydown [name="users"]'(e, t) {
// 		if ([8, 46].includes(e.keyCode) && e.target.value === '') {
// 			const users = t.selectedUsers;
// 			const usersArr = users.get();
// 			usersArr.pop();
// 			return users.set(usersArr);
// 		}
//
// 		t.ac.onKeyDown(e);
// 	},
// 	'keyup [name="users"]'(e, t) {
// 		t.ac.onKeyUp(e);
// 	},
// 	'focus [name="users"]'(e, t) {
// 		t.ac.onFocus(e);
// 	},
// 	'blur [name="users"]'(e, t) {
// 		t.ac.onBlur(e);
// 	},
// };
//
// const validateChannelName = (name) => {
// 	if (settings.get('UI_Allow_room_names_with_special_chars')) {
// 		return true;
// 	}
//
// 	const reg = new RegExp(`^${ settings.get('UTF8_Names_Validation') }$`);
// 	return name.length === 0 || reg.test(name);
// };
//
// const filterNames = (old) => {
// 	if (settings.get('UI_Allow_room_names_with_special_chars')) {
// 		return old;
// 	}
//
// 	const reg = new RegExp(`^${ settings.get('UTF8_Names_Validation') }$`);
// 	return [...old.replace(' ', '').toLocaleLowerCase()].filter((f) => reg.test(f)).join('');
// };
//

const numberList = {
	18139900996: "+18139900996",
	14439370949: "+14439370949",
	18139990990: "+18139990990",
	17272708181: "+17272708181",
	12129181876: "+12129181876",
	12028755580: "+12028755580",
	18135638800: "+18135638800",
	18339568700: "+18339568700",
	18558766239: "+18558766239",
	18448555611: "+18448555611",
	18132804355: "+18132804355",
}

const validatePhoneNum = (numbers) => {
	const reg = new RegExp(`^[0-9]{7,15}(,[0-9]{7,15})*$`);
	return reg.test(numbers);
};

Template.sendSMS.onCreated(function() {
	this.fromNumber = new ReactiveVar(Object.keys(numberList)[0]);
	this.toNumbers = new ReactiveVar(false);
	this.toNumbersCSV = new ReactiveVar(false);
	this.smsText = new ReactiveVar(false);

	Session.set("smsLength", 0);
});

Template.sendSMS.helpers({
	fromNumbers() {
		const result = Object.entries(numberList)
			.map(([number, formattedNumber]) => ({ name: formattedNumber, key: number }));

		return result;
	},
	assetAccept() {
		if (fileConstraints.extensions && fileConstraints.extensions.length) {
			return `.${ fileConstraints.extensions.join(', .') }`;
		}
	},
	smsLength() {
    return Session.get('smsLength');
  }
});

Template.sendSMS.events({
	'change [name="fromNumber"]'(e, t) {
		t.fromNumber.set(e.target.value);
	},
	'change [name="toNumbers"]'(e, t) {
		t.toNumbers.set(e.target.value);
	},
	'input [name="smsText"]'(e, t) {
		const input = e.target;
		t.smsText.set(input.value);
		Session.set("smsLength", input.value.length);
	},
	'input [name="toNumbersCSV"]'(e, t) {
		const input = e.target;
		console.log("file input", input);
		// t.toNumbersCSV.set(input.value);
	},
	'submit .send-sms__content'(e, instance) {
		e.preventDefault();
		e.stopPropagation();
		const toNumbers = instance.toNumbers.get();
		const fromNumber = instance.fromNumber.get();
		// const toNumbersCSV = instance.toNumbersCSV.get();
		const smsText = instance.smsText.get();

		if(!validatePhoneNum(toNumbers)){
			toastr.warning(TAPi18n.__('Send_sms_with_mobex_error_to_num'));
			return false;
		}

		if(!smsText || smsText == '' || smsText.length == 0){
			toastr.warning(TAPi18n.__('Send_sms_with_mobex_error_text'));
			return false;
		}

		// if (instance.invalid.get() || instance.inUse.get()) {
		// 	return e.target.name.focus();
		// }

		if(toNumbers.indexOf(',') > -1){
			const toNumbersArr = toNumbers.split(',');

			Meteor.call('sendBatchSMS', fromNumber, toNumbersArr, smsText, (err, smsResult) => {

				if(!err){
					if(smsResult['isSuccess']){
						toastr.success(TAPi18n.__('Send_sms_with_mobex_success') + " " + smsResult['data']['data']['messageCount'] + " message sent.");
					}else{
						toastr.error(smsResult['resultMsg']);
					}

				}else{
					toastr.error(TAPi18n.__('Send_sms_with_mobex_error'));
				}

			});
		}else{
			Meteor.call('sendSingleSMS', fromNumber, toNumbers, smsText, (err, smsResult) => {

				if(!err){
					if(smsResult['isSuccess']){
						toastr.success(TAPi18n.__('Send_sms_with_mobex_success') + " " + smsResult['resultMsg']);
					}else{
						toastr.error(smsResult['resultMsg']);
					}

				}else{
					toastr.error(TAPi18n.__('Send_sms_with_mobex_error'));
				}

			});
		}

		return false;
	},
});
// Template.sendSMS.helpers({
// 	autocomplete(key) {
// 		const instance = Template.instance();
// 		const param = instance.ac[key];
// 		return typeof param === 'function' ? param.apply(instance.ac) : param;
// 	},
// 	items() {
// 		return Template.instance().ac.filteredList();
// 	},
// 	config() {
// 		const filter = Template.instance().userFilter;
// 		return {
// 			filter: filter.get(),
// 			noMatchTemplate: 'userSearchEmpty',
// 			modifier(text) {
// 				const f = filter.get();
// 				return `@${ f.length === 0 ? text : text.replace(new RegExp(filter.get()), function(part) {
// 					return `<strong>${ part }</strong>`;
// 				}) }`;
// 			},
// 		};
// 	},
// 	selectedUsers() {
// 		return Template.instance().selectedUsers.get();
// 	},
// 	inUse() {
// 		return Template.instance().inUse.get();
// 	},
// 	invalidChannel() {
// 		const instance = Template.instance();
// 		const invalid = instance.invalid.get();
// 		const inUse = instance.inUse.get();
// 		return invalid || inUse;
// 	},
// 	typeLabel() {
// 		return t(Template.instance().type.get() === 'p' ? t('Private_Channel') : t('Public_Channel'));
// 	},
// 	typeDescription() {
// 		return t(Template.instance().type.get() === 'p' ? t('Just_invited_people_can_access_this_channel') : t('Everyone_can_access_this_channel'));
// 	},
// 	broadcast() {
// 		return Template.instance().broadcast.get();
// 	},
// 	encrypted() {
// 		return Template.instance().encrypted.get();
// 	},
// 	encryptedDisabled() {
// 		return Template.instance().type.get() !== 'p' || Template.instance().broadcast.get();
// 	},
// 	e2eEnabled() {
// 		return settings.get('E2E_Enable');
// 	},
// 	readOnly() {
// 		return Template.instance().readOnly.get();
// 	},
// 	readOnlyDescription() {
// 		return t(Template.instance().readOnly.get() ? t('Only_authorized_users_can_write_new_messages') : t('All_users_in_the_channel_can_write_new_messages'));
// 	},
// 	cantCreateBothTypes() {
// 		return !hasAllPermission(['create-c', 'create-p']);
// 	},
// 	roomTypeIsP() {
// 		return Template.instance().type.get() === 'p';
// 	},
// 	createIsDisabled() {
// 		const instance = Template.instance();
// 		const invalid = instance.invalid.get();
// 		const extensions_invalid = instance.extensions_invalid.get();
// 		const inUse = instance.inUse.get();
// 		const name = instance.name.get();
//
// 		if (name.length === 0 || invalid || inUse === true || inUse === undefined || extensions_invalid) {
// 			return 'disabled';
// 		}
// 		return '';
// 	},
// 	iconType() {
// 		return Template.instance().type.get() === 'p' ? 'lock' : 'hashtag';
// 	},
// 	tokenAccessEnabled() {
// 		return settings.get('API_Tokenpass_URL') !== '';
// 	},
// 	tokenIsDisabled() {
// 		return Template.instance().type.get() !== 'p' ? 'disabled' : null;
// 	},
// 	tokensRequired() {
// 		return Template.instance().tokensRequired.get() && Template.instance().type.get() === 'p';
// 	},
// 	extensionsConfig() {
// 		const instance = Template.instance();
// 		return {
// 			validations : instance.extensions_validations,
// 			submits: instance.extensions_submits,
// 			change: instance.change,
// 		};
// 	},
// 	roomTypesBeforeStandard() {
// 		const orderLow = roomTypes.roomTypesOrder.filter((roomTypeOrder) => roomTypeOrder.identifier === 'c')[0].order;
// 		return roomTypes.roomTypesOrder.filter(
// 			(roomTypeOrder) => roomTypeOrder.order < orderLow
// 		).map(
// 			(roomTypeOrder) => roomTypes.roomTypes[roomTypeOrder.identifier]
// 		).filter((roomType) => roomType.creationTemplate);
// 	},
// 	roomTypesAfterStandard() {
// 		const orderHigh = roomTypes.roomTypesOrder.filter((roomTypeOrder) => roomTypeOrder.identifier === 'd')[0].order;
// 		return roomTypes.roomTypesOrder.filter(
// 			(roomTypeOrder) => roomTypeOrder.order > orderHigh
// 		).map(
// 			(roomTypeOrder) => roomTypes.roomTypes[roomTypeOrder.identifier]
// 		).filter((roomType) => roomType.creationTemplate);
// 	},
// });
//
// Template.sendSMS.events({
// 	...acEvents,
// 	'click .rc-tags__tag'({ target }, t) {
// 		const { username } = Blaze.getData(target);
// 		t.selectedUsers.set(t.selectedUsers.get().filter((user) => user.username !== username));
// 	},
// 	'change [name=setTokensRequired]'(e, t) {
// 		t.tokensRequired.set(e.currentTarget.checked);
// 		t.change();
// 	},
// 	'change [name="type"]'(e, t) {
// 		t.type.set(e.target.checked ? e.target.value : 'c');
// 		t.change();
// 	},
// 	'change [name="broadcast"]'(e, t) {
// 		t.broadcast.set(e.target.checked);
// 		t.change();
// 	},
// 	'change [name="encrypted"]'(e, t) {
// 		t.encrypted.set(e.target.checked);
// 		t.change();
// 	},
// 	'change [name="readOnly"]'(e, t) {
// 		t.readOnly.set(e.target.checked);
// 	},
// 	'input [name="users"]'(e, t) {
// 		const input = e.target;
// 		const position = input.selectionEnd || input.selectionStart;
// 		const { length } = input.value;
// 		const modified = filterNames(input.value);
// 		input.value = modified;
// 		document.activeElement === input && e && /input/i.test(e.type) && (input.selectionEnd = position + input.value.length - length);
//
// 		t.userFilter.set(modified);
// 	},
// 	'input [name="name"]'(e, t) {
// 		const input = e.target;
// 		const position = input.selectionEnd || input.selectionStart;
// 		const { length } = input.value;
// 		const modified = filterNames(input.value);
//
// 		input.value = modified;
// 		document.activeElement === input && e && /input/i.test(e.type) && (input.selectionEnd = position + input.value.length - length);
// 		t.invalid.set(!validateChannelName(input.value));
// 		if (input.value !== t.name.get()) {
// 			t.inUse.set(undefined);
// 			t.checkChannel(input.value);
// 			t.name.set(modified);
// 		}
// 	},
// 	'submit .create-channel__content'(e, instance) {
// 		e.preventDefault();
// 		e.stopPropagation();
// 		const name = e.target.name.value;
// 		const type = instance.type.get();
// 		const readOnly = instance.readOnly.get();
// 		const broadcast = instance.broadcast.get();
// 		const encrypted = instance.encrypted.get();
// 		const isPrivate = type === 'p';
//
// 		if (instance.invalid.get() || instance.inUse.get()) {
// 			return e.target.name.focus();
// 		}
// 		if (!Object.keys(instance.extensions_validations).map((key) => instance.extensions_validations[key]).reduce((valid, fn) => fn(instance) && valid, true)) {
// 			return instance.extensions_invalid.set(true);
// 		}
//
// 		const extraData = Object.keys(instance.extensions_submits)
// 			.reduce((result, key) => ({ ...result, ...instance.extensions_submits[key](instance) }), { broadcast, encrypted });
//
// 		Meteor.call(isPrivate ? 'createPrivateGroup' : 'sendSMS', name, instance.selectedUsers.get().map((user) => user.username), readOnly, {}, extraData, function(err, result) {
// 			if (err) {
// 				if (err.error === 'error-invalid-name') {
// 					return instance.invalid.set(true);
// 				}
// 				if (err.error === 'error-duplicate-channel-name') {
// 					return instance.inUse.set(true);
// 				}
// 				return;
// 			}
//
// 			if (!isPrivate) {
// 				callbacks.run('aftercreateCombined', { _id: result.rid, name: result.name });
// 			}
//
// 			return FlowRouter.go(isPrivate ? 'group' : 'channel', { name: result.name }, FlowRouter.current().queryParams);
// 		});
// 		return false;
// 	},
// });
//
// Template.sendSMS.onRendered(function() {
// 	const users = this.selectedUsers;
//
// 	this.firstNode.querySelector('[name="users"]').focus();
// 	this.ac.element = this.firstNode.querySelector('[name="users"]');
// 	this.ac.$element = $(this.ac.element);
// 	this.ac.$element.on('autocompleteselect', function(e, { item }) {
// 		const usersArr = users.get();
// 		usersArr.push(item);
// 		users.set(usersArr);
// 	});
// });
//
// Template.sendSMS.onCreated(function() {
// 	this.selectedUsers = new ReactiveVar([]);
//
// 	const filter = { exceptions :[Meteor.user().username].concat(this.selectedUsers.get().map((u) => u.username)) };
// 	// this.onViewRead:??y(function() {
// 	Tracker.autorun(() => {
// 		filter.exceptions = [Meteor.user().username].concat(this.selectedUsers.get().map((u) => u.username));
// 	});
// 	this.extensions_validations = {};
// 	this.extensions_submits = {};
// 	this.name = new ReactiveVar('');
// 	this.type = new ReactiveVar(hasAllPermission(['create-p']) ? 'p' : 'c');
// 	this.readOnly = new ReactiveVar(false);
// 	this.broadcast = new ReactiveVar(false);
// 	this.encrypted = new ReactiveVar(false);
// 	this.inUse = new ReactiveVar(undefined);
// 	this.invalid = new ReactiveVar(false);
// 	this.extensions_invalid = new ReactiveVar(false);
// 	this.change = _.debounce(() => {
// 		let valid = true;
// 		Object.keys(this.extensions_validations).map((key) => this.extensions_validations[key]).forEach((f) => (valid = f(this) && valid));
// 		this.extensions_invalid.set(!valid);
// 	}, 300);
//
// 	Tracker.autorun(() => {
// 		const broadcast = this.broadcast.get();
// 		if (broadcast) {
// 			this.readOnly.set(true);
// 			this.encrypted.set(false);
// 		}
//
// 		const type = this.type.get();
// 		if (type !== 'p') {
// 			this.encrypted.set(false);
// 		}
// 	});
//
// 	this.userFilter = new ReactiveVar('');
// 	this.tokensRequired = new ReactiveVar(false);
// 	this.checkChannel = _.debounce((name) => {
// 		if (validateChannelName(name)) {
// 			return Meteor.call('roomNameExists', name, (error, result) => {
// 				if (error) {
// 					return;
// 				}
// 				this.inUse.set(result);
// 			});
// 		}
// 		this.inUse.set(undefined);
// 	}, 1000);
//
// 	this.ac = new AutoComplete(
// 		{
// 			selector:{
// 				item: '.rc-popup-list__item',
// 				container: '.rc-popup-list__list',
// 			},
//
// 			limit: 10,
// 			inputDelay: 300,
// 			rules: [
// 				{
// 				// @TODO maybe change this 'collection' and/or template
// 					collection: 'UserAndRoom',
// 					subscription: 'userAutocomplete',
// 					field: 'username',
// 					matchAll: true,
// 					filter,
// 					doNotChangeWidth: false,
// 					selector(match) {
// 						return { term: match };
// 					},
// 					sort: 'username',
// 				},
// 			],
//
// 		});
//
// 	// this.firstNode.querySelector('[name=name]').focus();
// 	// this.ac.element = this.firstNode.querySelector('[name=users]');
// 	// this.ac.$element = $(this.ac.element);
// 	this.ac.tmplInst = this;
// });
