import { Meteor } from 'meteor/meteor';

import { Rooms } from '../../../models';

Meteor.methods({
	updateCompanyGroup(data) {
		return Rooms.updateMobexCompanyRoom(data.rid, data.name, data.mobexData);
	},
});
