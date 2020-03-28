import { Meteor } from 'meteor/meteor';

import { updateVisitor } from '../functions';

Meteor.methods({
	updateVisitor(visitorId, visitorData) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'updateMessage' });
		}

		return updateVisitor(visitorId, visitorData);
	},
});
