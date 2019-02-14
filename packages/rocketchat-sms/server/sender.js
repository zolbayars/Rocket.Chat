import { Meteor } from 'meteor/meteor';
import { RocketChat } from 'meteor/rocketchat:lib';

Meteor.methods({
	'sendSingleSMS'(from, to, smsText) {
			console.log('sendSingleSMS called ', to);

			const SMSService = RocketChat.SMS.getService(RocketChat.settings.get('SMS_Service'));

			console.log('sendSingleSMS SMSService ', SMSService);
    	if (!SMSService) {
    		return 'You have to configure SMS service on the Admin panel to use this feature';
    	}

    	const result = SMSService.send(from, to, smsText);
      console.log('sendSingleSMS result', result);
      return result;
	},
	async sendBatchSMS(from, to, smsText) {
			console.log(`sendBatchSMS called ${ to }`);

			const SMSService = RocketChat.SMS.getService(RocketChat.settings.get('SMS_Service'));

			console.log('sendBatchSMS SMSService ', SMSService);
			if (!SMSService) {
				return 'You have to configure SMS service on the Admin panel to use this feature';
			}

			const result = {
				isSuccess: false,
				resultMsg: 'An unknown error happened',
				data: null,
			};

			const mobexResult = await SMSService.sendBatch(from, to, smsText);

			console.log('mobexResult result in sender.js: ', mobexResult);

			if (mobexResult.isSuccess) {
				if (mobexResult.response.statusCode === 200) {
					console.log('SMS Mobex response: ', mobexResult.response.content);
					result.resultMsg = mobexResult.resultMsg;
					result.isSuccess = true;
					result.data = mobexResult.response.content;
				} else {
					result.resultMsg = 'Could not able to send SMS. Code: ' + mobexResult.response.statusCode;
					console.error('SMS Mobex response: ', mobexResult.response.statusCode);
				}
			} else {
				result.resultMsg  = mobexResult.resultMsg;
			}

      console.log('sendBatchSMS result. ', result);
      return result;
	},

});
