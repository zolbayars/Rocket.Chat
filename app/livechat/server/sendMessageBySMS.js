/* eslint-disable no-unused-vars */
/* eslint-disable complexity */
import { callbacks } from '../../callbacks';
import { settings } from '../../settings';
import { SMS } from '../../sms';
import { LivechatVisitors, Messages, UploadsChunks } from '../../models';
import { normalizeMessageFileUpload } from '../../utils/server/functions/normalizeMessageFileUpload';

callbacks.add('afterSaveMessage', async function(message, room) {
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
			try {
				Messages.addToOrUpdateThread(message.u._id, message._id, message.ts, room._id);
			} catch (error) {
				// When we receive SMS and redirect it to a department channel, this one is getting called too
				console.error('Error while addToOrUpdateThread', error.message);
			}
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

	let extraData;
	if (message.file) {
		message = normalizeMessageFileUpload(message);
		const { fileUpload, rid, u: { _id: userId } = {} } = message;
		extraData = Object.assign({}, { rid, userId, fileUpload });
	}

	if (message.location) {
		const { location } = message;
		extraData = Object.assign({}, extraData, { location });
	}

	const SMSService = SMS.getService(settings.get('SMS_Service'));

	if (!SMSService) {
		return message;
	}

	const getSMSServiceName = () => {
		let name = 'notMobex';
		try {
			name = SMSService.getServiceName();
		} catch (error) {
			console.error('error while getting SMS service name', error);
		}
		console.log('SMS service name', name);
		return name;
	};


	// Check if mobex bot is trying to send SMS
	if (message.u.username === 'mobex.bot') {
		if (getSMSServiceName() === 'teli') {
			SMSService.send(room.customFields.phone, message.customFields.toNumber, message.customFields.text);
		} else {
			// throw new Error('Please choose Mobex MMS as the SMS service provider on Admin → SMS!');
			return message;
		}

		// Turned out the following would only work for the Mobex service
		// SMSService.send(room.customFields.phone, message.customFields.toNumber, message.customFields.text,
		// 	room.customFields.mobexUsername, room.customFields.mobexPassword);
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


		// SMSService.send(room.sms.from, visitor.phone[0].phoneNumber, message.msg);
	}

	return message;
}, callbacks.priority.LOW, 'sendMessageBySms');
