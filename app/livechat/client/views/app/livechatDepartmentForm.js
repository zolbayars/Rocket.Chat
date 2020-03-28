import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Template } from 'meteor/templating';
import _ from 'underscore';
import toastr from 'toastr';

import { TabBar, RocketChatTabBar } from '../../../../ui-utils';
import { t, handleError } from '../../../../utils';
import { hasPermission } from '../../../../authorization';
import { getCustomFormTemplate } from './customTemplates/register';
import './livechatDepartmentForm.html';
import { APIClient } from '../../../../utils/client';

Template.livechatDepartmentForm.helpers({
	department() {
		return Template.instance().department.get();
	},
	agents() {
		return Template.instance().department && !_.isEmpty(Template.instance().department.get()) ? Template.instance().department.get().agents : [];
	},
	departmentAgents() {
		return _.sortBy(Template.instance().departmentAgents.get(), 'username');
	},
	showOnRegistration(value) {
		const department = Template.instance().department.get();
		return department.showOnRegistration === value || (department.showOnRegistration === undefined && value === true);
	},
	showOnOfflineForm(value) {
		const department = Template.instance().department.get();
		return department.showOnOfflineForm === value || (department.showOnOfflineForm === undefined && value === true);
	},
	requestTagBeforeClosingChat() {
		const department = Template.instance().department.get();
		return !!(department && department.requestTagBeforeClosingChat);
	},
	customFieldsTemplate() {
		return getCustomFormTemplate('livechatDepartmentForm');
	},
	data() {
		return { id: FlowRouter.getParam('_id') };
	},
	exceptionsAgents() {
		return _.pluck(Template.instance().departmentAgents.get(), 'username');
	},
	agentModifier() {
		return (filter, text = '') => {
			const f = filter.get();
			return `@${
				f.length === 0
					? text
					: text.replace(
						new RegExp(filter.get()),
						(part) => `<strong>${ part }</strong>`,
					)
			}`;
		};
	},
	agentConditions() {
		return { roles: 'livechat-agent' };
	},
	onSelectAgents() {
		return Template.instance().onSelectAgents;
	},
	selectedAgents() {
		return Template.instance().selectedAgents.get();
	},
	onClickTagAgents() {
		return Template.instance().onClickTagAgents;
	},
	flexData() {
		return {
			tabBar: Template.instance().tabBar,
			data: Template.instance().tabBarData.get(),
		};
	},
	tabBarVisible() {
		return Object.values(TabBar.buttons.get())
			.some((button) => button.groups
				.some((group) => group.startsWith('livechat-department')));
	},
	chatClosingTags() {
		return Template.instance().chatClosingTags.get();
	},
	availableDepartmentTags() {
		return Template.instance().availableDepartmentTags.get();
	},
	hasAvailableTags() {
		return [...Template.instance().availableTags.get()].length > 0;
	},
	hasChatClosingTags() {
		return [...Template.instance().chatClosingTags.get()].length > 0;
	},
});

Template.livechatDepartmentForm.events({
	async 'submit #department-form'(e, instance) {
		e.preventDefault();
		const $btn = instance.$('button.save');

		let departmentData;

		const _id = $(e.currentTarget).data('id');

		if (hasPermission('manage-livechat-departments')) {
			const enabled = instance.$('input[name=enabled]:checked').val();
			const name = instance.$('input[name=name]').val();
			const phone = instance.$('input[name=phone]').val();
			const mobexUsername = instance.$('input[name=mobexUsername]').val();
			const mobexPassword = instance.$('input[name=mobexPassword]').val();
			const description = instance.$('textarea[name=description]').val();
			const showOnRegistration = instance.$('input[name=showOnRegistration]:checked').val();
			const email = instance.$('input[name=email]').val();
			const showOnOfflineForm = instance.$('input[name=showOnOfflineForm]:checked').val();
			const requestTagBeforeClosingChat = instance.$('input[name=requestTagBeforeClosingChat]:checked').val();
			const chatClosingTags = instance.chatClosingTags.get();
			if (enabled !== '1' && enabled !== '0') {
				return toastr.error(t('Please_select_enabled_yes_or_no'));
			}

			if (name.trim() === '') {
				return toastr.error(t('Please_fill_a_name'));
			}

			if (email.trim() === '' && showOnOfflineForm === '1') {
				return toastr.error(t('Please_fill_an_email'));
			}

			departmentData = {
				enabled: enabled === '1',
				name: name.trim(),
				phone: phone.trim(),
				mobexUsername: mobexUsername.trim(),
				mobexPassword: mobexPassword.trim(),
				description: description.trim(),
				showOnRegistration: showOnRegistration === '1',
				showOnOfflineForm: showOnOfflineForm === '1',
				requestTagBeforeClosingChat: requestTagBeforeClosingChat === '1',
				email: email.trim(),
				chatClosingTags,
			};
		}

		const oldBtnValue = $btn.html();
		$btn.html(t('Saving'));

		instance.$('.customFormField').each((i, el) => {
			const elField = instance.$(el);
			const name = elField.attr('name');
			departmentData[name] = elField.val();
		});

		const departmentAgents = [];
		instance.departmentAgents.get().forEach((agent) => {
			agent.count = instance.$(`.count-${ agent.agentId }`).val();
			agent.order = instance.$(`.order-${ agent.agentId }`).val();

			departmentAgents.push(agent);
		});

		console.log('departmentData', departmentData);

		const callback = (error) => {
			$btn.html(oldBtnValue);
			if (error) {
				return handleError(error);
			}

			toastr.success(t('Saved'));
			FlowRouter.go('livechat-departments');
		};

		// Mobex Department Creation
		// Creating a channel whenever a department is created
		// TODO - here we have to update the current private group
		try {
			const validChannelName = departmentData.name.trim().replace(/\s/gi, '-');
			const members = departmentAgents.map((agent) => agent.username);

			Meteor.call('livechat:checkDepartmentChannel', validChannelName, function(error, currentChannel) {
				console.log('currentChannel', currentChannel);
				if (error || !currentChannel || currentChannel.length === 0) {
					members.push('rocket.cat');
					members.push('mobex.bot');

					Meteor.call('createPrivateGroup', validChannelName,
						members, {}, {
							open: true,
							mobexUsername: departmentData.mobexUsername,
							mobexPassword: departmentData.mobexPassword,
							phone: departmentData.phone,
						}, function(error, channelCreationResult) {
							if (error) {
								console.error('Error while creating a channel for department', error.message);
								return toastr.error(t('Could_not_create_department_channel'));
							}
							console.log('channelCreationResult', channelCreationResult);
							departmentData.rid = channelCreationResult.rid;

							Meteor.call('livechat:saveDepartment', _id, departmentData, departmentAgents, callback);
							Meteor.call('livechat:saveDepartmentAgents', _id, departmentAgents, callback);
						});
				} else {
					departmentData.rid = currentChannel[0]._id;

					const mobexData = {
						mobexUsername: departmentData.mobexUsername,
						mobexPassword: departmentData.mobexPassword,
						phone: departmentData.phone,
					};

					Meteor.call('addUsersToRoom', { rid: currentChannel[0]._id, users: members });
					Meteor.call('updateCompanyGroup', { rid: currentChannel[0]._id, name: currentChannel[0].name, mobexData });
					Meteor.call('livechat:saveDepartment', _id, departmentData, departmentAgents, callback);
					Meteor.call('livechat:saveDepartmentAgents', _id, departmentAgents, callback);
				}
			});
		} catch (error) {
			console.error('error while creating channel', error);
		}
	},

	'click .add-agent'(e, instance) {
		e.preventDefault();

		const users = instance.selectedAgents.get();

		users.forEach(async (user) => {
			const { _id, username } = user;

			const departmentAgents = instance.departmentAgents.get();
			if (departmentAgents.find(({ agentId }) => agentId === _id)) {
				return toastr.error(t('This_agent_was_already_selected'));
			}

			const newAgent = _.clone(user);
			newAgent.agentId = _id;
			delete newAgent._id;
			departmentAgents.push(newAgent);
			instance.departmentAgents.set(departmentAgents);
			instance.selectedAgents.set(instance.selectedAgents.get().filter((user) => user.username !== username));
		});
	},

	'click button.back'(e/* , instance*/) {
		e.preventDefault();
		FlowRouter.go('livechat-departments');
	},

	'click .remove-agent'(e, instance) {
		e.preventDefault();

		instance.departmentAgents.set(instance.departmentAgents.get().filter((agent) => agent.agentId !== this.agentId));
	},

	'click #addTag'(e, instance) {
		e.stopPropagation();
		e.preventDefault();

		const isSelect = [...instance.availableTags.get()].length > 0;
		const elId = isSelect ? '#tagSelect' : '#tagInput';
		const elDefault = isSelect ? 'placeholder' : '';

		const tag = $(elId).val();
		const chatClosingTags = [...instance.chatClosingTags.get()];
		if (tag === '' || chatClosingTags.indexOf(tag) > -1) {
			return;
		}

		chatClosingTags.push(tag);
		instance.chatClosingTags.set(chatClosingTags);
		$(elId).val(elDefault);
	},

	'click .remove-tag'(e, instance) {
		e.stopPropagation();
		e.preventDefault();

		const chatClosingTags = [...instance.chatClosingTags.get()].filter((el) => el !== this.valueOf());
		instance.chatClosingTags.set(chatClosingTags);
	},
});

Template.livechatDepartmentForm.onCreated(async function() {
	this.department = new ReactiveVar({ enabled: true });
	this.departmentAgents = new ReactiveVar([]);
	this.selectedAgents = new ReactiveVar([]);
	this.tabBar = new RocketChatTabBar();
	this.tabBar.showGroup(FlowRouter.current().route.name);
	this.tabBarData = new ReactiveVar();
	this.chatClosingTags = new ReactiveVar([]);
	this.availableTags = new ReactiveVar([]);
	this.availableDepartmentTags = new ReactiveVar([]);

	this.onSelectAgents = ({ item: agent }) => {
		this.selectedAgents.set([agent]);
	};

	this.onClickTagAgents = ({ username }) => {
		this.selectedAgents.set(this.selectedAgents.get().filter((user) => user.username !== username));
	};

	this.loadAvailableTags = (departmentId) => {
		Meteor.call('livechat:getTagsList', (err, tagsList) => {
			this.availableTags.set(tagsList || []);
			const tags = this.availableTags.get();
			const availableTags = tags
				.filter(({ departments }) => departments.length === 0 || departments.indexOf(departmentId) > -1)
				.map(({ name }) => name);
			this.availableDepartmentTags.set(availableTags);
		});
	};

	this.autorun(async () => {
		const id = FlowRouter.getParam('_id');
		if (id) {
			const { department, agents } = await APIClient.v1.get(`livechat/department/${ FlowRouter.getParam('_id') }`);
			this.department.set(department);
			this.departmentAgents.set(agents);
			this.chatClosingTags.set((department && department.chatClosingTags) || []);
			this.loadAvailableTags(id);
		}
	});
});
