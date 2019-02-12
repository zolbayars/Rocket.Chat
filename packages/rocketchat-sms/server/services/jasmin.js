import { RocketChat } from 'meteor/rocketchat:lib';
import { HTTP } from 'meteor/http';

class Jasmin {
	constructor() {
		this.address = RocketChat.settings.get('SMS_Jasmin_gateway_address');
		this.username = RocketChat.settings.get('SMS_Jasmin_username');
		this.password = RocketChat.settings.get('SMS_Jasmin_password');
		this.from = RocketChat.settings.get('SMS_Jasmin_from_number');
	}
	parse(data) {
		let numMedia = 0;

		console.log('Jasmin parse: ', data);

		const returnData = {
			from: data.from,
			to: data.to,
			body: data.content,

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
	send(fromNumber, toNumber, message) {

		console.log('Jasmin send fromNumber', fromNumber);
		console.log('Jasmin send toNumber', toNumber);
		console.log('Jasmin send message', message);
		console.log('Jasmin send username', this.username);
		console.log('Jasmin send address', this.address);
		console.log('Jasmin send password', this.password);
		console.log('Jasmin send from', this.from);

		let currentFrom = this.from;
		if(fromNumber){
			currentFrom = fromNumber;
		}

		const strippedTo = toNumber.replace(/\D/g, '');
		let result = {
			'isSuccess': false,
			'resultMsg': "An unknown error happened"
		}
		try {
			const response = HTTP.call('GET', `${ this.address }/send?username=${ this.username }&password=${ this.password }&to=${ strippedTo }&from=${ currentFrom }&content=${ message }`);
			if (response.statusCode === 200) {
				console.log('SMS Jasmin response: ', response.content);
				result['resultMsg'] = 'Sent SMS with Mobex. ID: ' + response.content;
				result['isSuccess'] = true;
			} else {
				result['resultMsg'] = 'Could not able to send SMS. Code: ' + response.statusCode;
				console.log('SMS Jasmin response: ', response.statusCode);
			}
		} catch (e) {
			result['resultMsg'] = 'Error while sending SMS with Mobex. Detail: ' + e;
			console.error('Error while sending SMS with Mobex', e);
		}

		return result; 

	}
	response(/* message */) {
		console.log('Jasmin response called');
		return {
			headers: {
				'Content-Type': 'text/xml',
			},
			body: 'ACK/Jasmin',
		};
	}
	error(error) {
		console.error('Jasmin error called', error);
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

RocketChat.SMS.registerService('jasmin', Jasmin);
