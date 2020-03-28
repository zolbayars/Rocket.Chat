import { Meteor } from 'meteor/meteor';
import _ from 'underscore';
import s from 'underscore.string';

import { Users, Rooms, Subscriptions } from '../../../models';
import { callbacks } from '../../../callbacks';
import { addUserRoles } from '../../../authorization';
import { getValidRoomName } from '../../../utils';
import { Apps } from '../../../apps/server';
import { createDirectRoom } from './createDirectRoom';

export const createRoom = function(type, name, owner, members = [], readOnly, extraData = {}, options = {}) {
	callbacks.run('beforeCreateRoom', { type, name, owner, members, readOnly, extraData, options });

	if (type === 'd') {
		return createDirectRoom(members[0], members[1], extraData, options);
	}

	name = s.trim(name);
	owner = s.trim(owner);
	members = [].concat(members);

	if (!name) {
		throw new Meteor.Error('error-invalid-name', 'Invalid name', { function: 'RocketChat.createRoom' });
	}

	owner = Users.findOneByUsernameIgnoringCase(owner, { fields: { username: 1 } });
	if (!owner) {
		throw new Meteor.Error('error-invalid-user', 'Invalid user', { function: 'RocketChat.createRoom' });
	}

	if (!_.contains(members, owner.username)) {
		members.push(owner.username);
	}

	if (extraData.broadcast) {
		readOnly = true;
		delete extraData.reactWhenReadOnly;
	}

	const now = new Date();

	const validRoomNameOptions = {};

	if (options.nameValidationRegex) {
		validRoomNameOptions.nameValidationRegex = options.nameValidationRegex;
	}

	let room = Object.assign({
		name: getValidRoomName(name, null, validRoomNameOptions),
		fname: name,
		t: type,
		msgs: 0,
		usersCount: 0,
		u: {
			_id: owner._id,
			username: owner.username,
		},
	}, extraData, {
		ts: now,
		ro: readOnly === true,
	});

	// Mobex Department Creation Start
	if (extraData.customFields.open) {
		room.open = true;
	}

	if (extraData.customFields.mobexUsername && extraData.customFields.mobexPassword) {
		room.mobex_username = extraData.customFields.mobexUsername;
		room.mobex_password = extraData.customFields.mobexPassword;
		room.phone = extraData.customFields.phone;
	}
	// Mobex Department Creation End

	if (type === 'd') {
		room.usernames = members;
	}

	if (Apps && Apps.isLoaded()) {
		const prevent = Promise.await(Apps.getBridges().getListenerBridge().roomEvent('IPreRoomCreatePrevent', room));
		if (prevent) {
			throw new Meteor.Error('error-app-prevented-creation', 'A Rocket.Chat App prevented the room creation.');
		}

		let result;
		result = Promise.await(Apps.getBridges().getListenerBridge().roomEvent('IPreRoomCreateExtend', room));
		result = Promise.await(Apps.getBridges().getListenerBridge().roomEvent('IPreRoomCreateModify', result));

		if (typeof result === 'object') {
			room = Object.assign(room, result);
		}
	}

	if (type === 'c') {
		callbacks.run('beforeCreateChannel', owner, room);
	}

	room = Rooms.createWithFullRoomData(room);

	for (const username of members) {
		const member = Users.findOneByUsername(username, { fields: { username: 1, 'settings.preferences': 1 } });
		if (!member) {
			continue;
		}

		const extra = options.subscriptionExtra || {};

		extra.open = true;

		if (room.prid) {
			extra.prid = room.prid;
		}

		if (username === owner.username) {
			extra.ls = now;
		}

		Subscriptions.createWithRoomAndUser(room, member, extra);
	}

	addUserRoles(owner._id, ['owner'], room._id);

	if (type === 'c') {
		Meteor.defer(() => {
			callbacks.run('afterCreateChannel', owner, room);
		});
	} else if (type === 'p') {
		Meteor.defer(() => {
			callbacks.run('afterCreatePrivateGroup', owner, room);
		});
	}
	Meteor.defer(() => {
		callbacks.run('afterCreateRoom', owner, room);
	});

	if (Apps && Apps.isLoaded()) {
		// This returns a promise, but it won't mutate anything about the message
		// so, we don't really care if it is successful or fails
		Apps.getBridges().getListenerBridge().roomEvent('IPostRoomCreate', room);
	}

	return {
		rid: room._id, // backwards compatible
		...room,
	};
};
