import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Rooms } from '../../../models';

// Mobex Department Creation
Meteor.methods({
	checkDepartmentChannel(name) {
		check(name, String);

		return Rooms.findOneByDepartmentName(name).fetch();
	},
});
