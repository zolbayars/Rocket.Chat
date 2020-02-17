import { callbacks } from '../../callbacks';
import { settings } from '../../settings';
import { SMS } from '../../sms';
import { LivechatVisitors, Messages, UploadsChunks } from '../../models';

callbacks.add('afterSaveMessage', async function(message, room) {
	console.log('sendMessageBySms called message', message);
	console.log('sendMessageBySms called message channels', message.channels);
	console.log('sendMessageBySms called room', room);

	// skips this callback if the message was edited
	if (message.editedAt) {
		return message;
	}

	// skip if it's not from mobex.bot
	if (!SMS.enabled && message.u.username !== 'mobex.bot' && !(room.customFields && room.customFields.mobexUsername)) {
		return message;
	}

	if (room.customFields && room.customFields.mobexUsername) {
		const customerNumber = parseInt(message.u.username);
		if (message.u.username !== 'mobex.bot' && !isNaN(customerNumber)) {
			Messages.addToOrUpdateThread(message.u._id, message._id, message.ts, room._id);
		}
	}

	// only send the sms by SMS if it is a livechat room with SMS set to true
	// plus that, send by SMS if it's from the Mobex Bot
	if (message.u.username !== 'mobex.bot' && !(typeof room.t !== 'undefined' && room.t === 'l' && room.sms && room.v && room.v.token) && !room.phone) {
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

	const SMSService = SMS.getService(settings.get('SMS_Service'));

	if (!SMSService) {
		return message;
	}


	// Check if mobex bot is trying to send SMS
	if (message.u.username === 'mobex.bot') {
		SMSService.send(room.customFields.phone, message.customFields.toNumber, message.customFields.text,
			room.customFields.mobexUsername, room.customFields.mobexPassword);
	} else if (message.tmid && room.phone) {
		// Sending message to a number from a company channel
		const thread = Messages.findThreadById(message.tmid, room._id);
		const toUser = parseInt(thread.u.username);
		if (!isNaN(toUser)) {
			SMSService.send(room.phone, `${ toUser }`, message.msg);
		}
	} else {
		if (!room.v) {
			return message;
		}
		const visitor = LivechatVisitors.getVisitorByToken(room.v.token);

		if (!visitor || !visitor.phone || visitor.phone.length === 0) {
			return message;
		}

		// Check if it's a MMS
		if (message.attachments && message.attachments.length > 0 && message.file) {
			const fileContent = UploadsChunks.findByFileId(message.file._id);

			const attachmentInBase64 = Buffer.from(fileContent.data).toString('base64');
			console.log('b64encoded MMS attachment', attachmentInBase64);

			SMSService.send(room.sms.from, visitor.phone[0].phoneNumber, null, message.file.name, attachmentInBase64);
		} else {
			SMSService.send(room.sms.from, visitor.phone[0].phoneNumber, message.msg);
		}


		SMSService.send(room.sms.from, visitor.phone[0].phoneNumber, message.msg);
	}

	return message;
}, callbacks.priority.LOW, 'sendMessageBySms');
