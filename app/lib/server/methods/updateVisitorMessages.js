import { Meteor } from 'meteor/meteor';

import { updateVisitorMessages } from '../functions';

Meteor.methods({
	updateVisitorMessages(visitorId, visitorData) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'updateMessage' });
		}

		return updateVisitorMessages(visitorId, visitorData);
	},
});
