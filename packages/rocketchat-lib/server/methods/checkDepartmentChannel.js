import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';

Meteor.methods({
	checkDepartmentChannel(name) {
		check(name, String);

		return RocketChat.models.Rooms.findOneByDepartmentName(name).fetch();
	},
});
