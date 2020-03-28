import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

import { LivechatRooms, LivechatVisitors, LivechatDepartment } from '../../../../models';
import { API } from '../../../../api';
import { SMS } from '../../../../sms';
import { Livechat } from '../../../server/lib/Livechat';
import { sendMessage } from '../../../../lib/server/functions/sendMessage';

const defineDepartment = (idOrName) => {
	if (!idOrName || idOrName === '') {
		return;
	}

	const department = LivechatDepartment.findOneByIdOrName(idOrName);
	return department && department._id;
};

const defineVisitor = (smsNumber, departmentId) => {
	let visitor;
	if (departmentId) {
		console.log('dep id to check', departmentId);
		visitor = LivechatVisitors.findOneVisitorByPhoneAndDepartment(smsNumber, departmentId);
	} else {
		visitor = LivechatVisitors.findOneVisitorByPhone(smsNumber);
	}
	let data = {
		token: (visitor && visitor.token) || Random.id(),
	};

	if (!visitor) {
		data = Object.assign(data, {
			username: smsNumber.replace(/[^0-9]/g, ''),
			phone: {
				number: smsNumber,
			},
		});
	}

	const department = defineDepartment(SMS.department);
	if (department) {
		data.department = department;
	}

	const id = Livechat.registerGuest(data);
	return LivechatVisitors.findOneById(id);
};

const normalizeLocationSharing = (payload) => {
	try {
		const { extra: { fromLatitude: latitude, fromLongitude: longitude } } = payload;
		if (!latitude || !longitude) {
			return null;
		}
		return {
			type: 'Point',
			coordinates: [parseFloat(longitude), parseFloat(latitude)],
		};
	} catch (error) {
		return null;
	}
};

API.v1.addRoute('livechat/sms-incoming/:service', {
	post() {
		const SMSService = SMS.getService(this.urlParams.service);
		const sms = SMSService.parse(this.bodyParams);

		// If there's a department with this number, send it to its channel
		let department = LivechatDepartment.findByDepartmentPhone(sms.to).fetch();
		let departmentId = null;
		// TODO check the number by adding 1 digit in front of it
		if (!department[0]) {
			console.log('Changed number:', `1${ sms.to }`);
			department = LivechatDepartment.findByDepartmentPhone(`1${ sms.to }`).fetch();
		}

		console.log('department in incoming SMS', department[0]);

		let visitor;
		if (department && department.length > 0) {
			departmentId = department[0]._id;
			visitor = defineVisitor(sms.from, departmentId);
		} else {
			visitor = defineVisitor(sms.from);
		}

		const { token } = visitor;
		const room = LivechatRooms.findOneByVisitorTokenAndDepartmentId(token, departmentId);
		const location = normalizeLocationSharing(sms);

		const messageToSend = {
			message: {
				_id: Random.id(),
				rid: (room && room._id) || Random.id(),
				token,
				msg: sms.body,
				...location && { location },
			},
			guest: visitor,
			roomInfo: {
				sms: {
					from: sms.to,
				},
			},
		};
		let sendMessageToChannel = null;

		if (visitor) {
			try {
				const rooms = LivechatRooms.findOpenByVisitorTokenAndDepartmentId(visitor.token, departmentId).fetch();

				if (rooms && rooms.length > 0) {
					messageToSend.message.rid = rooms[0]._id;
				} else {
					messageToSend.message.rid = Random.id();
				}
				messageToSend.message.token = visitor.token;
			} catch (error) {
				console.error('Error while there is a visitor', error);
			}

			// try {
			// 	// If there's a department with this number, send it to its channel
			// 	const department = LivechatDepartment.findByDepartmentPhone(sms.to).fetch();
			// 	console.log('visitor exists. department in incoming SMS', department[0]);

			// 	if (department && department.length > 0) {
			// 		console.log('setting department for the visitor now');
			// 		Livechat.setDepartmentForGuest({ token: visitor.token, department });
			// 		console.log('updated visitor', visitor);
			// 	}
			// } catch (error) {
			// 	console.error('error while getting department in incoming SMS', error);
			// }
		} else {
			messageToSend.message.rid = Random.id();
			messageToSend.message.token = Random.id();

			const visitorId = Livechat.registerGuest({
				username: sms.from.replace(/[^0-9]/g, ''),
				token: messageToSend.message.token,
				phone: {
					number: sms.from,
				},
			});

			visitor = LivechatVisitors.findOneById(visitorId);
		}


		messageToSend.message.msg = sms.body;
		messageToSend.guest = visitor;

		messageToSend.message.attachments = sms.media.map((curr) => {
			const attachment = {
				message_link: curr.url,
			};

			const { contentType } = curr;
			switch (contentType.substr(0, contentType.indexOf('/'))) {
				case 'image':
					attachment.image_url = curr.url;
					break;
				case 'video':
					attachment.video_url = curr.url;
					break;
				case 'audio':
					attachment.audio_url = curr.url;
					break;
			}

			return attachment;
		});

		// Mobex Department Creation
		// use this to send the SMS to its department channel
		try {
			if (department && department.length > 0) {
				sendMessageToChannel = JSON.parse(JSON.stringify(messageToSend));
				sendMessageToChannel.message.rid = department[0].rid;
				sendMessageToChannel.message.token = visitor.token;
				sendMessageToChannel.message._id = Random.id();
				sendMessageToChannel.room = {};
				sendMessageToChannel.room._id = department[0].rid;
				Livechat.setDepartmentForGuest({ token: visitor.token, department: department[0]._id });
			}
		} catch (error) {
			console.error('error while getting department in incoming SMS', error);
		}

		console.log('messageToSend', messageToSend);
		console.log('sendMessageToChannel', sendMessageToChannel);
		try {
			const message = SMSService.response.call(this, Promise.await(Livechat.sendMessage(messageToSend)));
			console.log('message result', message);

			if (sendMessageToChannel) {
				const user = {
					_id: sendMessageToChannel.guest._id,
					username: sendMessageToChannel.guest.username,
					name: sendMessageToChannel.guest.username,
				};
				const room = {
					_id: sendMessageToChannel.room._id,
					customFields: {
						mobexUsername: 'john',
					},
				};
				const messageToChannel = Promise.await(sendMessage(user, sendMessageToChannel.message, room));
				console.log('sendMessageToChannel result', messageToChannel);
			}

			Meteor.defer(() => {
				if (sms.extra) {
					if (sms.extra.fromCountry) {
						Meteor.call('livechat:setCustomField', messageToSend.message.token, 'country', sms.extra.fromCountry);
					}
					if (sms.extra.fromState) {
						Meteor.call('livechat:setCustomField', messageToSend.message.token, 'state', sms.extra.fromState);
					}
					if (sms.extra.fromCity) {
						Meteor.call('livechat:setCustomField', messageToSend.message.token, 'city', sms.extra.fromCity);
					}
				}
			});

			return message;
		} catch (e) {
			return SMSService.error.call(this, e);
		}
	},
});
