import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { LivechatRooms } from '../../../models';

// Mobex Department Creation
Meteor.methods({
	'livechat:checkDepartmentChannel'(name) {
		check(name, String);

		return LivechatRooms.findOneByDepartmentName(name).fetch();
	},
});
