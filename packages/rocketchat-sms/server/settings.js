import { Meteor } from 'meteor/meteor';
import { RocketChat } from 'meteor/rocketchat:lib';

Meteor.startup(function() {
	RocketChat.settings.addGroup('SMS', function() {
		this.add('SMS_Enabled', false, {
			type: 'boolean',
			i18nLabel: 'Enabled',
		});

		this.add('SMS_Service', 'twilio', {
			type: 'select',
			values: [{
				key: 'twilio',
				i18nLabel: 'Twilio',
			}, {
				key: 'mobex',
				i18nLabel: 'Mobex',
			}],
			i18nLabel: 'Service',
		});

		this.section('Twilio', function() {
			this.add('SMS_Twilio_Account_SID', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'twilio',
				},
				i18nLabel: 'Account_SID',
			});
			this.add('SMS_Twilio_authToken', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'twilio',
				},
				i18nLabel: 'Auth_Token',
			});
		});

		this.section('Mobex', function() {
			this.add('SMS_Mobex_gateway_address', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_address',
				i18nDescription: 'Mobex_sms_gateway_address_desc',
			});
			this.add('SMS_Mobex_restful_address', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_restful_address',
				i18nDescription: 'Mobex_sms_gateway_restful_address_desc',
			});
			this.add('SMS_Mobex_username', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_username',
			});
			this.add('SMS_Mobex_password', '', {
				type: 'string',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_password',
			});
			this.add('SMS_Mobex_from_number', '', {
				type: 'int',
				enableQuery: {
					_id: 'SMS_Service',
					value: 'mobex',
				},
				i18nLabel: 'Mobex_sms_gateway_from_number',
				i18nDescription: 'Mobex_sms_gateway_from_number_desc',
			});
		});

	});
});
