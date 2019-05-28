import { callbacks } from '../../callbacks';
import { settings } from '../../settings';
import { SMS } from '../../sms';
import { LivechatVisitors } from '../../models';

callbacks.add('afterSaveMessage', function(message, room) {
	console.log('sendMessageBySms called message', message);
	console.log('sendMessageBySms called message channels', message.channels);
	console.log('sendMessageBySms called room', room);

	// skips this callback if the message was edited
	if (message.editedAt) {
		return message;
	}

	if (!SMS.enabled && message.u.username !== 'mobex.bot') {
		return message;
	}

	// only send the sms by SMS if it is a livechat room with SMS set to true
	// plus that, send by SMS if it's from the Mobex Bot
	if (message.u.username !== 'mobex.bot' && !(typeof room.t !== 'undefined' && room.t === 'l' && room.sms && room.v && room.v.token)) {
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
	} else {
		const visitor = LivechatVisitors.getVisitorByToken(room.v.token);

		if (!visitor || !visitor.phone || visitor.phone.length === 0) {
			return message;
		}

		SMSService.send(room.sms.from, visitor.phone[0].phoneNumber, message.msg);
	}

	return message;
}, callbacks.priority.LOW, 'sendMessageBySms');
