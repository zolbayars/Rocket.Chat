import { Meteor } from 'meteor/meteor';

import { SMS } from './SMS';
import { settings } from '../../settings';

Meteor.methods({
	'getFromNumbersList'() {
		const numbersList = settings.get('SMS_Mobex_from_numbers_list');
		const numbersListMMS = settings.get('MMS_Mobex_from_numbers_list');

		let numbersArr = numbersList.replace(/\s/g, '').split(',') || [];
		if (numbersListMMS !== '') {
			numbersArr = numbersListMMS.replace(/\s/g, '').split(',') || [];
		}
		// console.log('getFromNumbersList result arr', numbersArr);

		const numbersObj = {};
		if (numbersArr && numbersArr.length > 0) {
			numbersArr.forEach((element) => {
				numbersObj[element] = `+${ element }`;
			});
		}

		// console.log('getFromNumbersList result', numbersObj);

		return numbersObj;
	},
	'sendSingleSMS'(from, to, smsText) {
		console.log('sendSingleSMS called ', to);

		const SMSService = SMS.getService(settings.get('SMS_Service'));

		console.log('sendSingleSMS SMSService ', SMSService);
		if (!SMSService) {
			return 'You have to configure SMS service on the Admin panel to use this feature';
		}

		const result = SMSService.send(from, to, smsText);
		console.log('sendSingleSMS result', result);
		return result;
	},
	'sendSingleMMS'(from, to, fileName, fileData) {
		console.log('sendSingleMMS called ', to);
		console.log('sendSingleMMS fileData ', fileName);

		const SMSService = SMS.getService(settings.get('SMS_Service'));

		console.log('sendSingleMMS SMSService ', SMSService);
		if (!SMSService) {
			return 'You have to configure Mobex MMS service on the Admin panel to use this feature';
		}

		const result = SMSService.send(from, to, null, fileName, Buffer.from(fileData).toString('base64'));
		console.log('sendSingleMMS result', result);
		return result;
	},
	async 'sendBatchSMS'(from, to, smsText) {
		console.log(`sendBatchSMS called ${ to }`);

		const SMSService = SMS.getService(settings.get('SMS_Service'));

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
				console.log('MMS Mobex response: ', mobexResult.response.content);
				result.resultMsg = mobexResult.resultMsg;
				result.isSuccess = true;
				result.data = mobexResult.response.content;
			} else {
				result.resultMsg = `Could not able to send MMS. Code: ${ mobexResult.response.statusCode }`;
				console.error('MMS Mobex response: ', mobexResult.response.statusCode);
			}
		} else {
			result.resultMsg = mobexResult.resultMsg;
		}

		console.log('sendBatchSMS result. ', result);
		return result;
	},
	async sendBatchMMS(from, toArr, fileName, fileData) {
		console.log(`sendBatchMMS called ${ toArr }`);

		const SMSService = SMS.getService(settings.get('SMS_Service'));

		console.log('sendBatchMMS SMSService ', SMSService);
		if (!SMSService) {
			return 'You have to configure MMS service on the Admin panel to use this feature';
		}

		const result = {
			isSuccess: false,
			resultMsg: 'An unknown error happened',
			data: null,
		};

		let successCount = 0;
		let failCount = 0;

		toArr.forEach((to) => {
			const result = SMSService.send(from, to, null, fileName, Buffer.from(fileData).toString('base64'));
			console.log('sendBatchMMS result', result);
			if (result.isSuccess) {
				successCount++;
				console.log('MMS Mobex response: ', result.response.content);
				result.resultMsg = result.resultMsg;
				result.isSuccess = true;
				result.data = result.response.content;
			} else {
				failCount++;
				result.resultMsg = result.resultMsg;
			}
		});

		if (successCount > failCount) {
			result.resultMsg = `Successfully sent MMS to ${ successCount } numbers. Failure count: ${ failCount } `;
			result.isSuccess = true;
			result.data = result.response.content;
		} else {
			result.resultMsg = `Failed to send MMS to ${ failCount } numbers. Success count: ${ successCount } `;
		}

		console.log('sendBatchMMS result. ', result);
		return result;
	},

});
