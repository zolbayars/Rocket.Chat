import { Meteor } from 'meteor/meteor';
import { RocketChat } from 'meteor/rocketchat:lib';

Meteor.methods({
	'sendSingleSMS'(from, to, smsText) {
      console.log("sendSingleSMS called " + to);

    	const SMSService = RocketChat.SMS.getService(RocketChat.settings.get('SMS_Service'));

      console.log("sendSingleSMS SMSService ", SMSService);
    	if (!SMSService) {
    		return "You have to configure SMS service on the Admin panel to use this feature";
    	}

    	const result = SMSService.send(from, to, smsText);
      console.log("sendSingleSMS result", result);
      return result;
	},
	'sendBatchSMS'(from, to, smsText, callback) {
      console.log("sendBatchSMS called " + to);

    	const SMSService = RocketChat.SMS.getService(RocketChat.settings.get('SMS_Service'));

      console.log("sendBatchSMS SMSService ", SMSService);
    	if (!SMSService) {
    		return "You have to configure SMS service on the Admin panel to use this feature";
    	}

			let result = {
				'isSuccess': false,
				'resultMsg': "An unknown error happened",
				'data': null;
			}

    	SMSService.sendBatch(from, to, smsText, (error, res) => {
				console.log('sendBatch callback called. Error', error);

				if(error){
					result['resultMsg']  = error;
				}

				if (res.statusCode === 200) {
					console.log('SMS Mobex response: ', res.content);
					result['resultMsg'] = 'Success';
					result['isSuccess'] = true;
					result['data'] = res.content;
				} else {
					result['resultMsg'] = 'Could not able to send SMS. Code: ' + res.statusCode;
					console.error('SMS Mobex response: ', res.statusCode);
				}
			});

      console.log("sendBatchSMS result", result);
      return result;
	},
	// 'chatpalUtilsGetTaC'(lang) {
	// 	try {
	// 		const response = HTTP.call('GET', `https://beta.chatpal.io/v1/terms/${ lang }.html`);
	// 		if (response.statusCode === 200) {
	// 			return response.content;
	// 		} else {
	// 			return undefined;
	// 		}
	// 	} catch (e) {
	// 		return false;
	// 	}
	// },
});
