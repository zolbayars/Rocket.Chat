import { HTTP } from 'meteor/http';
import { Base64 } from 'meteor/base64';

import { SMS } from '../SMS';
import { settings } from '../../../settings';

class Teli {
	constructor() {
		this.token = settings.get('SMS_Teli_token');
		this.address = settings.get('SMS_Teli_restful_address');
		this.from = settings.get('SMS_Teli_from_number');
	}

	parse(data) {
		let numMedia = 0;

		console.log('Teli parse: ', data);

		const returnData = {
			from: data.source,
			to: data.destination,
			body: data.message,

			// extra: {
			// 	toCountry: data.ToCountry,
			// 	toState: data.ToState,
			// 	toCity: data.ToCity,
			// 	toZip: data.ToZip,
			// 	fromCountry: data.FromCountry,
			// 	fromState: data.FromState,
			// 	fromCity: data.FromCity,
			// 	fromZip: data.FromZip,
			// },
		};

		if (data.NumMedia) {
			numMedia = parseInt(data.NumMedia, 10);
		}

		if (isNaN(numMedia)) {
			console.error(`Error parsing NumMedia ${ data.NumMedia }`);
			return returnData;
		}

		returnData.media = [];

		for (let mediaIndex = 0; mediaIndex < numMedia; mediaIndex++) {
			const media = {
				url: '',
				contentType: '',
			};

			const mediaUrl = data[`MediaUrl${ mediaIndex }`];
			const contentType = data[`MediaContentType${ mediaIndex }`];

			media.url = mediaUrl;
			media.contentType = contentType;

			returnData.media.push(media);
		}

		return returnData;
	}

	getServiceName() {
		return 'teli';
	}

	send(fromNumber, toNumber, message, fileName = null, fileData = null) {
		console.log('Teli send fromNumber', fromNumber);
		console.log('Teli send toNumber', toNumber);
		console.log('Teli send message', message);
		console.log('Teli send from', this.from);

		let currentFrom = this.from;
		if (fromNumber) {
			currentFrom = fromNumber;
		}
		console.log('Teli send currentFrom', currentFrom);

		// const strippedTo = toNumber.replace(/\D/g, '');
		const result = {
			isSuccess: false,
			resultMsg: 'An unknown error happened',
		};

		let smsBody = {
			params: { source: currentFrom, destination: toNumber, message },
		};
		let type = 'sms';

		if (fileData) {
			type = 'mms';
			smsBody = {
				params: {
					source: currentFrom,
					destination: toNumber,
					file_name: fileName,
					file_data: fileData,
				},
			};
		}

		try {
			const response = HTTP.call('POST', `${ this.address }/${ type }/send?token=${ this.token }`,
				smsBody);
			result.response = response;
			if (response.statusCode === 200) {
				console.log('SMS Teli response: ', response.content);
				result.resultMsg = response.content;
				result.isSuccess = true;
			} else {
				result.resultMsg = `Could not able to send SMS. Code:  ${ response.statusCode }`;
				console.log('SMS Teli response: ', response.statusCode);
			}
		} catch (e) {
			result.resultMsg = `Error while sending SMS with Teli. Detail: ${ e }`;
			console.error('Error while sending SMS with Teli', e);
		}

		return result;
	}

	// Now turned into one-by-one sender
	// PLS note this was a mock implementation. Teli doesn't have API for batch SMS
	async sendBatch(fromNumber, toNumbersArr, message, fileName = null, fileData = null) {
		console.log('Teli send fromNumber', fromNumber);
		console.log('Teli send toNumbersArr', toNumbersArr);
		console.log('Teli send message', message);
		console.log('Teli send rest address', this.address);
		console.log('Teli send password', this.token);
		console.log('Teli send from', this.from);

		let currentFrom = this.from;
		if (fromNumber) {
			currentFrom = fromNumber;
		}
		console.log('Teli send currentFrom', currentFrom);

		const result = {
			isSuccess: false,
			resultMsg: 'An unknown error happened',
			response: false,
		};

		const allCount = toNumbersArr.length;
		let sentCount = 0;
		let errorMsg = '';
		toNumbersArr.forEach((number) => {
			const smsResult = this.send(fromNumber, number, message, fileName, fileData);
			if (smsResult.isSuccess) {
				sentCount++;
			} else {
				errorMsg = smsResult.resultMsg;
			}
			result.response = smsResult.response;
		});

		if (sentCount === allCount) {
			result.isSuccess = true;
			result.resultMsg = `Sent SMS to all ${ sentCount }/${ allCount } numbers`;
		} else {
			result.resultMsg = `SMS sent to ${ sentCount } numbers from ${ allCount } numbers. Error: ${ errorMsg }`;
		}

		return result;
	}

	response(/* message */) {
		return {
			headers: {
				'Content-Type': 'text/xml',
			},
			body: 'ACK/Jasmin',
		};
	}

	error(error) {
		console.error('Teli error called', error);
		let message = '';
		if (error.reason) {
			message = `<Message>${ error.reason }</Message>`;
		}
		return {
			headers: {
				'Content-Type': 'text/xml',
			},
			body: `<Response>${ message }</Response>`,
		};
	}
}

SMS.registerService('teli', Teli);
