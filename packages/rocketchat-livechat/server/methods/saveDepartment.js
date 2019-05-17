import { Meteor } from 'meteor/meteor';
import { RocketChat } from 'meteor/rocketchat:lib';

// TODO Company Registration #2
Meteor.methods({
	'livechat:saveDepartment'(_id, departmentData, departmentAgents) {
		if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'view-livechat-manager')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'livechat:saveDepartment' });
		}

		return RocketChat.Livechat.saveDepartment(_id, departmentData, departmentAgents);
	},
});
