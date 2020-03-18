import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';

import { Rooms, LivechatVisitors, LivechatDepartment } from '../../../../models';
import { API } from '../../../../api';
import { SMS } from '../../../../sms';
import { Livechat } from '../../../server/lib/Livechat';

API.v1.addRoute('livechat/sms-incoming/:service', {
	post() {
		const SMSService = SMS.getService(this.urlParams.service);

		const sms = SMSService.parse(this.bodyParams);

		console.log('sms-incoming called: ', sms);

		let visitor = LivechatVisitors.findOneVisitorByPhone(sms.from);

		const sendMessage = {
			message: {
				_id: Random.id(),
			},
			roomInfo: {
				sms: {
					from: sms.to,
				},
			},
		};
		let sendMessageToChannel = null;

		console.log('visitor', visitor);

		if (visitor) {
			const rooms = Rooms.findOpenLivechatByVisitorToken(visitor.token).fetch();

			console.log('room on findOpenLivechatByVisitorToken', rooms);

			if (rooms && rooms.length > 0) {
				sendMessage.message.rid = rooms[0]._id;
			} else {
				sendMessage.message.rid = Random.id();
			}
			sendMessage.message.token = visitor.token;

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
			sendMessage.message.rid = Random.id();
			sendMessage.message.token = Random.id();

			const visitorId = Livechat.registerGuest({
				username: sms.from.replace(/[^0-9]/g, ''),
				token: sendMessage.message.token,
				phone: {
					number: sms.from,
				},
			});

			visitor = LivechatVisitors.findOneById(visitorId);
		}

		sendMessage.message.msg = sms.body;
		sendMessage.guest = visitor;

		sendMessage.message.attachments = sms.media.map((curr) => {
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
			// If there's a department with this number, send it to its channel
			let department = LivechatDepartment.findByDepartmentPhone(sms.to).fetch();

			// TODO check the number by adding 1 digit in front of it
			if (!department[0]) {
				console.log('Changed number:', `1${ sms.to }`);
				department = LivechatDepartment.findByDepartmentPhone(`1${ sms.to }`).fetch();
			}

			console.log('department in incoming SMS', department[0]);

			if (department && department.length > 0) {
				sendMessageToChannel = JSON.parse(JSON.stringify(sendMessage));
				sendMessageToChannel.message.rid = department[0].rid;
				sendMessageToChannel.message.token = visitor.token;
				sendMessageToChannel.message._id = Random.id();
				console.log('setting department for the visitor now');
				Livechat.setDepartmentForGuest({ token: visitor.token, department: department[0]._id });
				console.log('updated visitor', visitor);
			}
		} catch (error) {
			console.error('error while getting department in incoming SMS', error);
		}

		try {
			console.log('sendMessage', sendMessage);
			console.log('sendMessageToChannel', sendMessageToChannel);


			const message = SMSService.response.call(this, Livechat.sendMessage(sendMessage));

			if (sendMessageToChannel) {
				const messageToChannel = SMSService.response.call(this, Livechat.sendMessage(sendMessageToChannel));
				console.log('messageToChannel', messageToChannel);
			}
			console.log('message', message);

			Meteor.defer(() => {
				if (sms.extra) {
					if (sms.extra.fromCountry) {
						Meteor.call('livechat:setCustomField', sendMessage.message.token, 'country', sms.extra.fromCountry);
					}
					if (sms.extra.fromState) {
						Meteor.call('livechat:setCustomField', sendMessage.message.token, 'state', sms.extra.fromState);
					}
					if (sms.extra.fromCity) {
						Meteor.call('livechat:setCustomField', sendMessage.message.token, 'city', sms.extra.fromCity);
					}
				}
			});

			return message;
		} catch (e) {
			return SMSService.error.call(this, e);
		}
	},
});
