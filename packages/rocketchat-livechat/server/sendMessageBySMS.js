import { RocketChat } from 'meteor/rocketchat:lib';

import LivechatVisitors from './models/LivechatVisitors';
import UploadsChunks from './models/UploadsChunks';

RocketChat.callbacks.add('afterSaveMessage', async function(message, room) {
	// skips this callback if the message was edited
	if (message.editedAt) {
		return message;
	}

	if (!RocketChat.SMS.enabled) {
		return message;
	}

	// only send the sms by SMS if it is a livechat room with SMS set to true
	if (!(typeof room.t !== 'undefined' && room.t === 'l' && room.sms && room.v && room.v.token)) {
		return message;
	}

	// if the message has a token, it was sent from the visitor, so ignore it
	if (message.token) {
		return message;
	}

	// if the message has a type means it is a special message (like the closing comment), so skips
	if (message.t) {
		return message;
	}

	const SMSService = RocketChat.SMS.getService(RocketChat.settings.get('SMS_Service'));

	if (!SMSService) {
		return message;
	}

	const visitor = LivechatVisitors.getVisitorByToken(room.v.token);

	if (!visitor || !visitor.phone || visitor.phone.length === 0) {
		return message;
	}

	console.log('message', message);

	if (message.attachments && message.attachments.length > 0 && message.file) {
		const fileContent = UploadsChunks.findByFileId(message.file._id);

		const attachmentInBase64 = Buffer.from(fileContent.data).toString('base64');
		console.log('b64encoded', attachmentInBase64);

		SMSService.send(room.sms.from, visitor.phone[0].phoneNumber, null, message.file.name, attachmentInBase64);
	} else {
		SMSService.send(room.sms.from, visitor.phone[0].phoneNumber, message.msg);
	}

	return message;
}, RocketChat.callbacks.priority.LOW, 'sendMessageBySms');
